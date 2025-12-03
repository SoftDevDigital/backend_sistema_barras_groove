import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DynamoDBService } from '../../shared/services/dynamodb.service';
import { BarModel } from '../../shared/models/bar.model';
import { CreateBarDto, UpdateBarDto, BarQueryDto } from '../dto/bar.dto';
import { IBar, IBarCreate } from '../../shared/interfaces/bar.interface';
import { ITicket } from '../../shared/interfaces/ticket.interface';
import { TABLE_NAMES } from '../../shared/config/dynamodb.config';

@Injectable()
export class BarService {
  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async create(createBarDto: CreateBarDto): Promise<IBar> {
    // Validar entrada
    if (!createBarDto.name || !createBarDto.eventId || !createBarDto.printer) {
      throw new BadRequestException('Name, event ID, and printer are required');
    }

    // Verificar que el evento existe
    await this.validateEventExists(createBarDto.eventId);

    // Verificar si ya existe un bar con el mismo nombre en el mismo evento
    const existingBar = await this.findByNameAndEvent(createBarDto.name, createBarDto.eventId);
    if (existingBar) {
      throw new ConflictException(`Bar '${createBarDto.name}' already exists in event '${createBarDto.eventId}'. Please choose a different name.`);
    }

    // Crear nuevo bar
    const barModel = new BarModel(createBarDto);
    await this.dynamoDBService.put(TABLE_NAMES.BARS, barModel.toDynamoDBItem());

    return {
      id: barModel.id,
      name: barModel.name,
      eventId: barModel.eventId,
      printer: barModel.printer,
      status: barModel.status,
      createdAt: barModel.createdAt,
      updatedAt: barModel.updatedAt,
    };
  }

  async findAll(query: BarQueryDto = {}): Promise<IBar[]> {
    let items: any[] = [];

    try {
      if (query.eventId) {
        // Intentar buscar por evento usando GSI1
        try {
          items = await this.dynamoDBService.query(
            TABLE_NAMES.BARS,
            'GSI1PK = :gsi1pk',
            {
              ':gsi1pk': `EVENT#${query.eventId}`,
            },
            undefined,
            'GSI1'
          );
        } catch (error) {
          // Fallback: usar scan si GSI1 no está disponible
          console.warn('GSI1 not available, using scan fallback for event query');
          items = await this.dynamoDBService.scan(
            TABLE_NAMES.BARS,
            'begins_with(PK, :pk)',
            {
              ':pk': 'BAR#',
            }
          );
          // Filtrar por eventId en memoria
          items = items.filter(item => item.eventId === query.eventId);
        }
      } else if (query.status) {
        // Intentar buscar por status usando GSI2
        try {
          items = await this.dynamoDBService.query(
            TABLE_NAMES.BARS,
            'GSI2PK = :gsi2pk',
            {
              ':gsi2pk': `BAR#${query.status}`,
            },
            undefined,
            'GSI2'
          );
        } catch (error) {
          // Fallback: usar scan si GSI2 no está disponible
          console.warn('GSI2 not available, using scan fallback for status query');
          items = await this.dynamoDBService.scan(
            TABLE_NAMES.BARS,
            'begins_with(PK, :pk)',
            {
              ':pk': 'BAR#',
            }
          );
          // Filtrar por status en memoria
          items = items.filter(item => item.status === query.status);
        }
      } else {
        // Buscar todos los bars
        items = await this.dynamoDBService.scan(
          TABLE_NAMES.BARS,
          'begins_with(PK, :pk)',
          {
            ':pk': 'BAR#',
          }
        );
      }
    } catch (error) {
      console.error('Error in findAll:', error.message);
      // Retornar array vacío en caso de error
      return [];
    }

    // Aplicar filtro de búsqueda si se proporciona
    if (query.search) {
      items = items.filter(item => 
        item.name?.toLowerCase().includes(query.search!.toLowerCase())
      );
    }

    return items.map(item => BarModel.fromDynamoDBItem(item));
  }

  async findOne(id: string): Promise<IBar> {
    // Validar entrada
    if (!id) {
      throw new BadRequestException('Bar ID is required');
    }

    const item = await this.dynamoDBService.get(TABLE_NAMES.BARS, {
      PK: `BAR#${id}`,
      SK: `BAR#${id}`,
    });

    if (!item) {
      throw new NotFoundException(`Bar with ID '${id}' not found. Please verify the bar ID and try again.`);
    }

    return BarModel.fromDynamoDBItem(item);
  }

  async update(id: string, updateBarDto: UpdateBarDto): Promise<IBar> {
    // Verificar que el bar existe
    const existingBar = await this.findOne(id);

    // Si se está actualizando el nombre, verificar que no exista otro bar con el mismo nombre en el mismo evento
    if (updateBarDto.name && updateBarDto.name !== existingBar.name) {
      const duplicateBar = await this.findByNameAndEvent(updateBarDto.name, existingBar.eventId);
      if (duplicateBar && duplicateBar.id !== id) {
        throw new ConflictException(`Cannot update bar '${existingBar.name}' to '${updateBarDto.name}'. A bar with this name already exists in event '${existingBar.eventId}'. Please choose a different name.`);
      }
    }

    // Actualizar el bar
    const updatedBar = {
      ...existingBar,
      ...updateBarDto,
      updatedAt: new Date().toISOString(),
    };

    const barModel = new BarModel();
    Object.assign(barModel, updatedBar);

    await this.dynamoDBService.put(TABLE_NAMES.BARS, barModel.toDynamoDBItem());

    return updatedBar;
  }

  async remove(id: string): Promise<{ message: string; deletedBar: IBar }> {
    // Verificar que el bar existe
    const existingBar = await this.findOne(id);

    // Eliminar el bar
    await this.dynamoDBService.delete(TABLE_NAMES.BARS, {
      PK: `BAR#${id}`,
      SK: `BAR#${id}`,
    });

    return {
      message: `Bar '${existingBar.name}' has been successfully deleted`,
      deletedBar: existingBar
    };
  }

  async findByEvent(eventId: string): Promise<IBar[]> {
    // Validar entrada
    if (!eventId) {
      throw new BadRequestException('Event ID is required');
    }

    console.log(`🔍 Searching bars for event: ${eventId}`);
    
    try {
      console.log('📊 Attempting GSI1 query...');
      const items = await this.dynamoDBService.query(
        TABLE_NAMES.BARS,
        'GSI1PK = :gsi1pk',
        {
          ':gsi1pk': `EVENT#${eventId}`,
        },
        undefined,
        'GSI1'
      );
      console.log(`✅ GSI1 query successful, found ${items.length} items`);
      return items.map(item => BarModel.fromDynamoDBItem(item));
    } catch (error) {
      console.warn(`⚠️ GSI1 query failed: ${error.message}`);
      console.log('🔄 Using scan fallback for findByEvent...');
      
      try {
        const items = await this.dynamoDBService.scan(
          TABLE_NAMES.BARS,
          'begins_with(PK, :pk)',
          {
            ':pk': 'BAR#',
          }
        );
        console.log(`📊 Scan found ${items.length} total bars`);
        
        // Filtrar por eventId en memoria
        const filteredItems = items.filter(item => item.eventId === eventId);
        console.log(`🎯 Filtered to ${filteredItems.length} bars for event ${eventId}`);
        
        return filteredItems.map(item => BarModel.fromDynamoDBItem(item));
      } catch (scanError) {
        console.error(`❌ Scan fallback also failed: ${scanError.message}`);
        return [];
      }
    }
  }

  async findByStatus(status: 'active' | 'closed'): Promise<IBar[]> {
    // Validar entrada
    if (!status) {
      throw new BadRequestException('Status is required');
    }

    if (status !== 'active' && status !== 'closed') {
      throw new BadRequestException('Status must be either "active" or "closed"');
    }

    try {
      const items = await this.dynamoDBService.query(
        TABLE_NAMES.BARS,
        'GSI2PK = :gsi2pk',
        {
          ':gsi2pk': `BAR#${status}`,
        },
        undefined,
        'GSI2'
      );
      return items.map(item => BarModel.fromDynamoDBItem(item));
    } catch (error) {
      // Fallback: usar scan si GSI2 no está disponible
      console.warn('GSI2 not available, using scan fallback for findByStatus');
      const items = await this.dynamoDBService.scan(
        TABLE_NAMES.BARS,
        'begins_with(PK, :pk)',
        {
          ':pk': 'BAR#',
        }
      );
      // Filtrar por status en memoria
      const filteredItems = items.filter(item => item.status === status);
      return filteredItems.map(item => BarModel.fromDynamoDBItem(item));
    }
  }

  async changeStatus(id: string, status: 'active' | 'closed'): Promise<IBar> {
    return this.update(id, { status });
  }

  private async validateEventExists(eventId: string): Promise<void> {
    try {
      const event = await this.dynamoDBService.get(TABLE_NAMES.EVENTS, {
        PK: `EVENT#${eventId}`,
        SK: `EVENT#${eventId}`,
      });

      if (!event) {
        throw new BadRequestException(`Event with ID '${eventId}' does not exist. Please create the event first or use a valid event ID.`);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Event with ID '${eventId}' does not exist. Please create the event first or use a valid event ID.`);
    }
  }

  private async findByNameAndEvent(name: string, eventId: string): Promise<IBar | null> {
    try {
      const items = await this.dynamoDBService.query(
        TABLE_NAMES.BARS,
        'GSI1PK = :gsi1pk',
        {
          ':gsi1pk': `EVENT#${eventId}`,
          ':name': name,
        },
        undefined,
        'GSI1'
      );

      // Filtrar por nombre ya que DynamoDB no soporta FilterExpression en query con GSI
      const filteredItems = items.filter(item => item.name === name);

      return filteredItems.length > 0 ? BarModel.fromDynamoDBItem(filteredItems[0]) : null;
    } catch (error) {
      return null;
    }
  }

  async getBarSalesSummary(barId: string): Promise<{
    bar: IBar;
    totalSales: number;
    totalTickets: number;
    totalRevenue: number;
    averageTicketValue: number;
    productsSold: Array<{
      productId: string;
      productName: string;
      quantitySold: number;
      revenue: number;
      percentage: number;
    }>;
    productsSoldByPaymentMethod: {
      cash: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
      card: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
      mixed: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
      administrator: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
      dj: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        percentage: number;
      }>;
    };
    salesByUser: Array<{
      userId: string;
      userName: string;
      ticketCount: number;
      totalSales: number;
    }>;
    salesByPaymentMethod: {
      cash: number;
      card: number;
      mixed: number;
      administrator: number;
      dj: number;
    };
    hourlyDistribution: Array<{
      hour: string;
      ticketCount: number;
      revenue: number;
    }>;
  }> {
    try {
      // Obtener información de la barra
      const bar = await this.findOne(barId);

      // Obtener todos los tickets de esta barra
      let ticketItems = [];
      try {
        // Intentar usar GSI2 primero
        ticketItems = await this.dynamoDBService.query(
          TABLE_NAMES.TICKETS,
          'GSI2PK = :gsi2pk',
          { ':gsi2pk': `BAR#${barId}` },
          undefined,
          'GSI2'
        );
      } catch (error) {
        // Fallback: usar scan y filtrar por barId
        console.warn('GSI2 not available for tickets, using scan fallback');
        const allTickets = await this.dynamoDBService.scan(TABLE_NAMES.TICKETS);
        ticketItems = allTickets.filter(t => t.barId === barId);
      }

      // Cargar items de cada ticket
      const ticketsWithItems: ITicket[] = [];
      for (const ticketItem of ticketItems) {
        const items = await this.dynamoDBService.query(
          TABLE_NAMES.TICKET_ITEMS,
          'PK = :pk AND begins_with(SK, :sk)',
          {
            ':pk': `TICKET#${ticketItem.id}`,
            ':sk': 'ITEM#'
          }
        );
        
        ticketsWithItems.push({
          ...ticketItem,
          items: items || []
        } as ITicket);
      }

      // Calcular totales
      const totalTickets = ticketsWithItems.length;
      const totalRevenue = ticketsWithItems.reduce((sum, t) => sum + (t.total || 0), 0);
      const totalSales = ticketsWithItems.filter(t => t.status === 'paid').length;
      const averageTicketValue = totalTickets > 0 ? totalRevenue / totalTickets : 0;

      // Productos más vendidos
      const productsMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      
      for (const ticket of ticketsWithItems) {
        for (const item of ticket.items) {
          const existing = productsMap.get(item.productId) || { name: item.productName, quantity: 0, revenue: 0 };
          existing.quantity += item.quantity;
          existing.revenue += item.total;
          productsMap.set(item.productId, existing);
        }
      }

      const productsSold = Array.from(productsMap.entries()).map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantitySold: data.quantity,
        revenue: data.revenue,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
      })).sort((a, b) => b.revenue - a.revenue);

      // Productos vendidos por método de pago
      const calculateProductsByPaymentMethod = (paymentMethod: 'cash' | 'card' | 'mixed' | 'administrator' | 'dj') => {
        const filteredTickets = ticketsWithItems.filter(t => t.paymentMethod === paymentMethod);
        const methodRevenue = filteredTickets.reduce((sum, t) => sum + (t.total || 0), 0);
        const productsMapByMethod = new Map<string, { name: string; quantity: number; revenue: number }>();
        
        for (const ticket of filteredTickets) {
          for (const item of ticket.items) {
            const existing = productsMapByMethod.get(item.productId) || { 
              name: item.productName, 
              quantity: 0, 
              revenue: 0 
            };
            existing.quantity += item.quantity;
            existing.revenue += item.total;
            productsMapByMethod.set(item.productId, existing);
          }
        }

        return Array.from(productsMapByMethod.entries()).map(([productId, data]) => ({
          productId,
          productName: data.name,
          quantitySold: data.quantity,
          revenue: data.revenue,
          percentage: methodRevenue > 0 ? (data.revenue / methodRevenue) * 100 : 0
        })).sort((a, b) => b.revenue - a.revenue);
      };

      const productsSoldByPaymentMethod = {
        cash: calculateProductsByPaymentMethod('cash'),
        card: calculateProductsByPaymentMethod('card'),
        mixed: calculateProductsByPaymentMethod('mixed'),
        administrator: calculateProductsByPaymentMethod('administrator'),
        dj: calculateProductsByPaymentMethod('dj')
      };

      // Ventas por usuario (bartender)
      const usersMap = new Map<string, { name: string; count: number; total: number }>();
      
      for (const ticket of ticketsWithItems) {
        const existing = usersMap.get(ticket.userId) || { name: ticket.userName, count: 0, total: 0 };
        existing.count += 1;
        existing.total += ticket.total || 0;
        usersMap.set(ticket.userId, existing);
      }

      const salesByUser = Array.from(usersMap.entries()).map(([userId, data]) => ({
        userId,
        userName: data.name,
        ticketCount: data.count,
        totalSales: data.total
      })).sort((a, b) => b.totalSales - a.totalSales);

      // Ventas por método de pago
      const salesByPaymentMethod = {
        cash: ticketsWithItems.filter(t => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.total, 0),
        card: ticketsWithItems.filter(t => t.paymentMethod === 'card').reduce((sum, t) => sum + t.total, 0),
        mixed: ticketsWithItems.filter(t => t.paymentMethod === 'mixed').reduce((sum, t) => sum + t.total, 0),
        administrator: ticketsWithItems.filter(t => t.paymentMethod === 'administrator').reduce((sum, t) => sum + t.total, 0),
        dj: ticketsWithItems.filter(t => t.paymentMethod === 'dj').reduce((sum, t) => sum + t.total, 0)
      };

      // Distribución por hora
      const hoursMap = new Map<string, { count: number; revenue: number }>();
      
      for (const ticket of ticketsWithItems) {
        const hour = new Date(ticket.createdAt).getHours().toString().padStart(2, '0') + ':00';
        const existing = hoursMap.get(hour) || { count: 0, revenue: 0 };
        existing.count += 1;
        existing.revenue += ticket.total || 0;
        hoursMap.set(hour, existing);
      }

      const hourlyDistribution = Array.from(hoursMap.entries()).map(([hour, data]) => ({
        hour,
        ticketCount: data.count,
        revenue: data.revenue
      })).sort((a, b) => a.hour.localeCompare(b.hour));

      return {
        bar,
        totalSales,
        totalTickets,
        totalRevenue,
        averageTicketValue,
        productsSold,
        productsSoldByPaymentMethod,
        salesByUser,
        salesByPaymentMethod,
        hourlyDistribution
      };

    } catch (error) {
      console.error('Error getting bar sales summary:', error);
      throw new BadRequestException('Failed to retrieve bar sales summary. Please try again.');
    }
  }
}
