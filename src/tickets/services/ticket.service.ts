import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { DynamoDBService } from '../../shared/services/dynamodb.service';
import { TicketModel, TicketItemModel } from '../../shared/models/ticket.model';
import { 
  CreateTicketDto, 
  UpdateTicketDto, 
  AddTicketItemDto, 
  UpdateTicketItemDto,
  ProcessPaymentDto,
  TicketQueryDto,
  TicketStatsQueryDto
} from '../dto/ticket.dto';
import { 
  ITicket, 
  ITicketItem, 
  ITicketCreate, 
  ITicketStats,
  ITicketPrintFormat 
} from '../../shared/interfaces/ticket.interface';
import { TABLE_NAMES } from '../../shared/config/dynamodb.config';
import { ProductService } from '../../products/services/product.service';
import { EmployeeService } from '../../employees/services/employee.service';
import { BarService } from '../../bars/services/bar.service';
import { EventService } from '../../events/services/event.service';
import { BusinessConfigService } from '../../shared/services/business-config.service';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly productService: ProductService,
    private readonly employeeService: EmployeeService,
    private readonly barService: BarService,
    private readonly eventService: EventService,
    private readonly businessConfigService: BusinessConfigService,
  ) {}

  // ===== TICKETS =====

  async create(createTicketDto: CreateTicketDto, employeeId: string): Promise<ITicket> {
    const startTime = Date.now();
    this.logger.log(`Creating ticket for employee ${employeeId}`, 'TicketService.create');

    try {
      // Validar entrada con mensajes específicos
      if (!employeeId || typeof employeeId !== 'string' || employeeId.trim().length === 0) {
        this.logger.warn('Invalid employee ID provided', 'TicketService.create');
        throw new BadRequestException('Employee ID is required and must be a valid string.');
      }

      if (!createTicketDto?.barId || typeof createTicketDto.barId !== 'string' || createTicketDto.barId.trim().length === 0) {
        this.logger.warn('Invalid bar ID provided', 'TicketService.create');
        throw new BadRequestException('Bar ID is required and must be a valid string. Please select a valid bar.');
      }

      // Verificar que el empleado existe
      this.logger.debug(`Validating employee ${employeeId}`, 'TicketService.create');
      const employee = await this.employeeService.findOne(employeeId);
      
      // Verificar que la barra existe
      this.logger.debug(`Validating bar ${createTicketDto.barId}`, 'TicketService.create');
      const bar = await this.barService.findOne(createTicketDto.barId);
      
      // Verificar que el evento existe
      this.logger.debug(`Validating event ${bar.eventId}`, 'TicketService.create');
      const event = await this.eventService.findOne(bar.eventId);

      // Crear nuevo ticket
      this.logger.debug('Creating ticket model', 'TicketService.create');
      const ticketModel = new TicketModel({
        ...createTicketDto,
        employeeId: employee.id,
        employeeName: employee.name,
        barId: bar.id,
        barName: bar.name,
        eventId: event.id,
        eventName: event.name,
      });

      // Guardar en base de datos
      this.logger.debug(`Saving ticket ${ticketModel.id} to database`, 'TicketService.create');
      await this.dynamoDBService.put(TABLE_NAMES.TICKETS, ticketModel.toDynamoDBItem());

      const duration = Date.now() - startTime;
      this.logger.log(`Ticket ${ticketModel.id} created successfully in ${duration}ms`, 'TicketService.create');

      return {
        id: ticketModel.id,
        employeeId: ticketModel.employeeId,
        employeeName: ticketModel.employeeName,
        barId: ticketModel.barId,
        barName: ticketModel.barName,
        eventId: ticketModel.eventId,
        eventName: ticketModel.eventName,
        status: ticketModel.status,
        subtotal: ticketModel.subtotal,
        totalTax: ticketModel.totalTax,
        total: ticketModel.total,
        items: ticketModel.items,
        notes: ticketModel.notes,
        printed: ticketModel.printed,
        createdAt: ticketModel.createdAt,
        updatedAt: ticketModel.updatedAt,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Re-lanzar errores conocidos con contexto
      if (error instanceof BadRequestException) {
        this.logger.warn(`Bad request when creating ticket after ${duration}ms: ${error.message}`, 'TicketService.create');
        throw error;
      }
      
      if (error instanceof NotFoundException) {
        this.logger.warn(`Resource not found when creating ticket after ${duration}ms: ${error.message}`, 'TicketService.create');
        throw error;
      }

      // Log error completo para debugging
      this.logger.error(`Unexpected error creating ticket after ${duration}ms:`, error.stack, 'TicketService.create');
      
      // Retornar error genérico pero informativo
      throw new BadRequestException('Unable to create ticket at this time. Please verify that all required information is correct and try again. If the problem persists, contact system administrator.');
    }
  }

  async findAll(query: TicketQueryDto = {}): Promise<ITicket[]> {
    const startTime = Date.now();
    this.logger.log('Searching tickets with filters', 'TicketService.findAll');

    try {
      let items: Record<string, any>[] = [];

      // Construir query según los filtros con logging
      if (query.employeeId) {
        this.logger.debug(`Searching tickets for employee ${query.employeeId}`, 'TicketService.findAll');
        items = await this.dynamoDBService.query(
          TABLE_NAMES.TICKETS,
          'GSI1PK = :gsi1pk',
          { ':gsi1pk': `EMPLOYEE#${query.employeeId}` },
          { 'GSI1': 'GSI1PK, GSI1SK' }
        );
      } else if (query.barId) {
        this.logger.debug(`Searching tickets for bar ${query.barId}`, 'TicketService.findAll');
        items = await this.dynamoDBService.query(
          TABLE_NAMES.TICKETS,
          'GSI2PK = :gsi2pk',
          { ':gsi2pk': `BAR#${query.barId}` },
          { 'GSI2': 'GSI2PK, GSI2SK' }
        );
      } else if (query.eventId) {
        this.logger.debug(`Searching tickets for event ${query.eventId}`, 'TicketService.findAll');
        items = await this.dynamoDBService.query(
          TABLE_NAMES.TICKETS,
          'GSI3PK = :gsi3pk',
          { ':gsi3pk': `EVENT#${query.eventId}` },
          { 'GSI3': 'GSI3PK, GSI3SK' }
        );
      } else {
        this.logger.debug('Searching all tickets', 'TicketService.findAll');
        items = await this.dynamoDBService.scan(TABLE_NAMES.TICKETS);
      }

      this.logger.debug(`Found ${items.length} tickets before filtering`, 'TicketService.findAll');

      // Filtrar resultados en memoria para filtros adicionales
      let filteredItems = items.filter(item => {
        try {
          if (query.status && item.status !== query.status) return false;
          if (query.paymentMethod && item.paymentMethod !== query.paymentMethod) return false;
          if (query.printed !== undefined && item.printed !== query.printed) return false;
          if (query.dateFrom && item.createdAt < query.dateFrom) return false;
          if (query.dateTo && item.createdAt > query.dateTo) return false;
          if (query.search) {
            const searchLower = query.search.toLowerCase();
            if (!item.employeeName?.toLowerCase().includes(searchLower) &&
                !item.barName?.toLowerCase().includes(searchLower)) return false;
          }
          return true;
        } catch (filterError) {
          this.logger.warn(`Error filtering ticket ${item.id}:`, filterError.message, 'TicketService.findAll');
          return false; // Excluir items con errores de filtrado
        }
      });

      this.logger.debug(`Found ${filteredItems.length} tickets after filtering`, 'TicketService.findAll');

      // Cargar items de cada ticket con manejo de errores
      const ticketsWithItems = await Promise.allSettled(
        filteredItems.map(async (item) => {
          try {
            const ticket = TicketModel.fromDynamoDBItem(item);
            ticket.items = await this.getTicketItems(ticket.id);
            return ticket;
          } catch (itemError) {
            this.logger.warn(`Error processing ticket ${item.id}:`, itemError.message, 'TicketService.findAll');
            return null;
          }
        })
      );

      // Filtrar resultados exitosos
      const validTickets = ticketsWithItems
        .filter((result): result is PromiseFulfilledResult<TicketModel> => 
          result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);

      this.logger.debug(`Successfully processed ${validTickets.length} tickets`, 'TicketService.findAll');

      const tickets = validTickets.map(ticket => ({
        id: ticket.id,
        employeeId: ticket.employeeId,
        employeeName: ticket.employeeName,
        barId: ticket.barId,
        barName: ticket.barName,
        eventId: ticket.eventId,
        eventName: ticket.eventName,
        status: ticket.status,
        paymentMethod: ticket.paymentMethod,
        subtotal: ticket.subtotal,
        totalTax: ticket.totalTax,
        total: ticket.total,
        paidAmount: ticket.paidAmount,
        changeAmount: ticket.changeAmount,
        items: ticket.items,
        notes: ticket.notes,
        printed: ticket.printed,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      }));

      const duration = Date.now() - startTime;
      this.logger.log(`Successfully retrieved ${tickets.length} tickets in ${duration}ms`, 'TicketService.findAll');
      
      return tickets;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Error retrieving tickets after ${duration}ms:`, error.stack, 'TicketService.findAll');
      
      // Retornar lista vacía en caso de error para no romper la aplicación
      this.logger.warn('Returning empty ticket list due to error', 'TicketService.findAll');
      return [];
    }
  }

  async findOne(id: string): Promise<ITicket> {
    const startTime = Date.now();
    this.logger.log(`Finding ticket ${id}`, 'TicketService.findOne');

    try {
      // Validar ID con mensajes específicos
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        this.logger.warn('Invalid ticket ID provided', 'TicketService.findOne');
        throw new BadRequestException('Ticket ID is required and must be a valid string. Please provide a valid ticket ID.');
      }

      // Limpiar ID
      const cleanId = id.trim();

      this.logger.debug(`Retrieving ticket ${cleanId} from database`, 'TicketService.findOne');
      const item = await this.dynamoDBService.get(TABLE_NAMES.TICKETS, {
        PK: `TICKET#${cleanId}`,
        SK: `TICKET#${cleanId}`,
      });

      if (!item) {
        this.logger.warn(`Ticket ${cleanId} not found`, 'TicketService.findOne');
        throw new NotFoundException(`Ticket with ID '${cleanId}' not found. Please verify the ticket ID and try again.`);
      }

      this.logger.debug(`Ticket ${cleanId} found, loading items`, 'TicketService.findOne');
      const ticket = TicketModel.fromDynamoDBItem(item);
      
      try {
        ticket.items = await this.getTicketItems(ticket.id);
      } catch (itemsError) {
        this.logger.warn(`Error loading items for ticket ${cleanId}:`, itemsError.message, 'TicketService.findOne');
        ticket.items = []; // Continuar con lista vacía de items
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Successfully retrieved ticket ${cleanId} in ${duration}ms`, 'TicketService.findOne');

      return {
        id: ticket.id,
        employeeId: ticket.employeeId,
        employeeName: ticket.employeeName,
        barId: ticket.barId,
        barName: ticket.barName,
        eventId: ticket.eventId,
        eventName: ticket.eventName,
        status: ticket.status,
        paymentMethod: ticket.paymentMethod,
        subtotal: ticket.subtotal,
        totalTax: ticket.totalTax,
        total: ticket.total,
        paidAmount: ticket.paidAmount,
        changeAmount: ticket.changeAmount,
        items: ticket.items,
        notes: ticket.notes,
        printed: ticket.printed,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Re-lanzar errores conocidos
      if (error instanceof BadRequestException) {
        this.logger.warn(`Bad request when finding ticket after ${duration}ms: ${error.message}`, 'TicketService.findOne');
        throw error;
      }
      
      if (error instanceof NotFoundException) {
        this.logger.warn(`Ticket not found after ${duration}ms: ${error.message}`, 'TicketService.findOne');
        throw error;
      }

      // Log error completo para debugging
      this.logger.error(`Unexpected error finding ticket after ${duration}ms:`, error.stack, 'TicketService.findOne');
      
      // Retornar error genérico pero informativo
      throw new BadRequestException('Unable to retrieve ticket information at this time. Please verify the ticket ID and try again. If the problem persists, contact system administrator.');
    }
  }

  async update(id: string, updateTicketDto: UpdateTicketDto): Promise<ITicket> {
    try {
      if (!id) {
        throw new BadRequestException('Ticket ID is required');
      }

      // Verificar que el ticket existe
      const existingTicket = await this.findOne(id);

      if (existingTicket.status === 'paid' && updateTicketDto.status && updateTicketDto.status !== 'paid') {
        throw new BadRequestException('Cannot modify status of a paid ticket');
      }

      const updateExpression: string[] = [];
      const expressionAttributeValues: Record<string, any> = {};
      const expressionAttributeNames: Record<string, string> = {};

      if (updateTicketDto.notes !== undefined) {
        updateExpression.push('#notes = :notes');
        expressionAttributeNames['#notes'] = 'notes';
        expressionAttributeValues[':notes'] = updateTicketDto.notes;
      }

      if (updateTicketDto.status !== undefined) {
        updateExpression.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = updateTicketDto.status;
      }

      if (updateExpression.length === 0) {
        throw new BadRequestException('No valid fields to update');
      }

      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      await this.dynamoDBService.update(
        TABLE_NAMES.TICKETS,
        { PK: `TICKET#${id}`, SK: `TICKET#${id}` },
        `SET ${updateExpression.join(', ')}`,
        expressionAttributeValues,
        expressionAttributeNames
      );

      return this.findOne(id);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error updating ticket:', error);
      throw new BadRequestException('Failed to update ticket. Please try again.');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!id) {
        throw new BadRequestException('Ticket ID is required');
      }

      // Verificar que el ticket existe
      await this.findOne(id);

      // Eliminar items del ticket primero
      const items = await this.getTicketItems(id);
      for (const item of items) {
        await this.dynamoDBService.delete(TABLE_NAMES.TICKET_ITEMS, {
          PK: `TICKET#${id}`,
          SK: `ITEM#${item.id}`,
        });
      }

      // Eliminar el ticket
      await this.dynamoDBService.delete(TABLE_NAMES.TICKETS, {
        PK: `TICKET#${id}`,
        SK: `TICKET#${id}`,
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting ticket:', error);
      throw new BadRequestException('Failed to delete ticket. Please try again.');
    }
  }

  // ===== TICKET ITEMS =====

  async addItem(ticketId: string, addItemDto: AddTicketItemDto): Promise<ITicketItem> {
    try {
      // Verificar que el ticket existe y está abierto
      const ticket = await this.findOne(ticketId);
      
      if (ticket.status !== 'open') {
        throw new BadRequestException('Cannot add items to a closed ticket');
      }

      // Verificar que el producto existe y está disponible
      const product = await this.productService.findOne(addItemDto.productId);
      
      if (!product.available || !product.active) {
        throw new BadRequestException('Product is not available for sale');
      }

      if (product.stock < addItemDto.quantity) {
        throw new BadRequestException(`Insufficient stock. Available: ${product.stock}, requested: ${addItemDto.quantity}`);
      }

      // Crear nuevo item
      const itemModel = new TicketItemModel({
        ticketId,
        productId: product.id,
        productName: product.name,
        quantity: addItemDto.quantity,
        unitPrice: product.price,
        taxRate: product.taxRate,
      });

      await this.dynamoDBService.put(TABLE_NAMES.TICKET_ITEMS, itemModel.toDynamoDBItem());

      // Actualizar totales del ticket
      await this.updateTicketTotals(ticketId);

      return {
        id: itemModel.id,
        ticketId: itemModel.ticketId,
        productId: itemModel.productId,
        productName: itemModel.productName,
        quantity: itemModel.quantity,
        unitPrice: itemModel.unitPrice,
        taxRate: itemModel.taxRate,
        subtotal: itemModel.subtotal,
        tax: itemModel.tax,
        total: itemModel.total,
        createdAt: itemModel.createdAt,
        updatedAt: itemModel.updatedAt,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error adding ticket item:', error);
      throw new BadRequestException('Failed to add item to ticket. Please try again.');
    }
  }

  async updateItem(ticketId: string, itemId: string, updateItemDto: UpdateTicketItemDto): Promise<ITicketItem> {
    try {
      // Verificar que el ticket existe y está abierto
      const ticket = await this.findOne(ticketId);
      
      if (ticket.status !== 'open') {
        throw new BadRequestException('Cannot modify items in a closed ticket');
      }

      // Obtener el item
      const item = await this.dynamoDBService.get(TABLE_NAMES.TICKET_ITEMS, {
        PK: `TICKET#${ticketId}`,
        SK: `ITEM#${itemId}`,
      });

      if (!item) {
        throw new NotFoundException(`Ticket item with ID '${itemId}' not found`);
      }

      // Verificar stock disponible
      const product = await this.productService.findOne(item.productId);
      
      if (product.stock < updateItemDto.quantity) {
        throw new BadRequestException(`Insufficient stock. Available: ${product.stock}, requested: ${updateItemDto.quantity}`);
      }

      // Actualizar cantidad y recalcular totales
      await this.dynamoDBService.update(
        TABLE_NAMES.TICKET_ITEMS,
        { PK: `TICKET#${ticketId}`, SK: `ITEM#${itemId}` },
        'SET #quantity = :quantity, #subtotal = :subtotal, #tax = :tax, #total = :total, #updatedAt = :updatedAt',
        {
          ':quantity': updateItemDto.quantity,
          ':subtotal': item.unitPrice * updateItemDto.quantity,
          ':tax': (item.unitPrice * updateItemDto.quantity) * (item.taxRate / 100),
          ':total': (item.unitPrice * updateItemDto.quantity) * (1 + item.taxRate / 100),
          ':updatedAt': new Date().toISOString(),
        },
        {
          '#quantity': 'quantity',
          '#subtotal': 'subtotal',
          '#tax': 'tax',
          '#total': 'total',
          '#updatedAt': 'updatedAt',
        }
      );

      // Actualizar totales del ticket
      await this.updateTicketTotals(ticketId);

      return this.getTicketItem(ticketId, itemId);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error updating ticket item:', error);
      throw new BadRequestException('Failed to update ticket item. Please try again.');
    }
  }

  async removeItem(ticketId: string, itemId: string): Promise<void> {
    try {
      // Verificar que el ticket existe y está abierto
      const ticket = await this.findOne(ticketId);
      
      if (ticket.status !== 'open') {
        throw new BadRequestException('Cannot remove items from a closed ticket');
      }

      // Verificar que el item existe
      const item = await this.dynamoDBService.get(TABLE_NAMES.TICKET_ITEMS, {
        PK: `TICKET#${ticketId}`,
        SK: `ITEM#${itemId}`,
      });

      if (!item) {
        throw new NotFoundException(`Ticket item with ID '${itemId}' not found`);
      }

      // Eliminar el item
      await this.dynamoDBService.delete(TABLE_NAMES.TICKET_ITEMS, {
        PK: `TICKET#${ticketId}`,
        SK: `ITEM#${itemId}`,
      });

      // Actualizar totales del ticket
      await this.updateTicketTotals(ticketId);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error removing ticket item:', error);
      throw new BadRequestException('Failed to remove ticket item. Please try again.');
    }
  }

  // ===== PAYMENT PROCESSING =====

  async processPayment(ticketId: string, paymentDto: ProcessPaymentDto): Promise<ITicket> {
    try {
      // Verificar que el ticket existe
      const ticket = await this.findOne(ticketId);
      
      if (ticket.status !== 'open') {
        throw new BadRequestException('Cannot process payment for a closed ticket');
      }

      if (ticket.items.length === 0) {
        throw new BadRequestException('Cannot process payment for an empty ticket');
      }

      if (paymentDto.paidAmount < ticket.total) {
        throw new BadRequestException(`Insufficient payment amount. Required: ${ticket.total}, provided: ${paymentDto.paidAmount}`);
      }

      // Calcular cambio
      const changeAmount = paymentDto.paymentMethod === 'cash' ? Math.max(0, paymentDto.paidAmount - ticket.total) : 0;

      // Actualizar ticket con información de pago
      await this.dynamoDBService.update(
        TABLE_NAMES.TICKETS,
        { PK: `TICKET#${ticketId}`, SK: `TICKET#${ticketId}` },
        'SET #status = :status, #paymentMethod = :paymentMethod, #paidAmount = :paidAmount, #changeAmount = :changeAmount, #updatedAt = :updatedAt',
        {
          ':status': 'paid',
          ':paymentMethod': paymentDto.paymentMethod,
          ':paidAmount': paymentDto.paidAmount,
          ':changeAmount': changeAmount,
          ':updatedAt': new Date().toISOString(),
        },
        {
          '#status': 'status',
          '#paymentMethod': 'paymentMethod',
          '#paidAmount': 'paidAmount',
          '#changeAmount': 'changeAmount',
          '#updatedAt': 'updatedAt',
        }
      );

      // Actualizar stock de productos
      for (const item of ticket.items) {
        await this.productService.updateStock(item.productId, {
          quantity: item.quantity,
          type: 'subtract',
          reason: `Ticket ${ticketId} - Sale`,
        });
      }

      return this.findOne(ticketId);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error processing payment:', error);
      throw new BadRequestException('Failed to process payment. Please try again.');
    }
  }

  // ===== STATISTICS =====

  async getStats(query: TicketStatsQueryDto = {}): Promise<ITicketStats> {
    try {
      const tickets = await this.findAll(query);

      const stats: ITicketStats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        paid: tickets.filter(t => t.status === 'paid').length,
        cancelled: tickets.filter(t => t.status === 'cancelled').length,
        refunded: tickets.filter(t => t.status === 'refunded').length,
        totalRevenue: tickets.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.total, 0),
        averageTicketValue: 0,
        mostSoldProducts: [],
      };

      // Calcular valor promedio
      const paidTickets = tickets.filter(t => t.status === 'paid');
      stats.averageTicketValue = paidTickets.length > 0 ? stats.totalRevenue / paidTickets.length : 0;

      // Calcular productos más vendidos
      const productSales: Map<string, { productId: string; productName: string; quantity: number; revenue: number }> = new Map();
      
      tickets.filter(t => t.status === 'paid').forEach(ticket => {
        ticket.items.forEach(item => {
          const existing = productSales.get(item.productId);
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += item.total;
          } else {
            productSales.set(item.productId, {
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              revenue: item.total,
            });
          }
        });
      });

      stats.mostSoldProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, query.topProducts || 10);

      return stats;
    } catch (error) {
      console.error('Error getting ticket stats:', error);
      throw new BadRequestException('Failed to retrieve ticket statistics. Please try again.');
    }
  }

  // ===== AUXILIARY METHODS =====

  private async getTicketItems(ticketId: string): Promise<ITicketItem[]> {
    try {
      const items = await this.dynamoDBService.query(
        TABLE_NAMES.TICKET_ITEMS,
        'PK = :pk',
        { ':pk': `TICKET#${ticketId}` }
      );

      return items.map(item => ({
        id: item.id,
        ticketId: item.ticketId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        subtotal: item.subtotal,
        tax: item.tax,
        total: item.total,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
    } catch (error) {
      console.error('Error getting ticket items:', error);
      return [];
    }
  }

  private async getTicketItem(ticketId: string, itemId: string): Promise<ITicketItem> {
    const item = await this.dynamoDBService.get(TABLE_NAMES.TICKET_ITEMS, {
      PK: `TICKET#${ticketId}`,
      SK: `ITEM#${itemId}`,
    });

    if (!item) {
      throw new NotFoundException(`Ticket item with ID '${itemId}' not found`);
    }

    return {
      id: item.id,
      ticketId: item.ticketId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      subtotal: item.subtotal,
      tax: item.tax,
      total: item.total,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private async updateTicketTotals(ticketId: string): Promise<void> {
    try {
      const items = await this.getTicketItems(ticketId);
      
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const totalTax = items.reduce((sum, item) => sum + item.tax, 0);
      const total = items.reduce((sum, item) => sum + item.total, 0);

      await this.dynamoDBService.update(
        TABLE_NAMES.TICKETS,
        { PK: `TICKET#${ticketId}`, SK: `TICKET#${ticketId}` },
        'SET #subtotal = :subtotal, #totalTax = :totalTax, #total = :total, #updatedAt = :updatedAt',
        {
          ':subtotal': subtotal,
          ':totalTax': totalTax,
          ':total': total,
          ':updatedAt': new Date().toISOString(),
        },
        {
          '#subtotal': 'subtotal',
          '#totalTax': 'totalTax',
          '#total': 'total',
          '#updatedAt': 'updatedAt',
        }
      );
    } catch (error) {
      console.error('Error updating ticket totals:', error);
      throw new BadRequestException('Failed to update ticket totals. Please try again.');
    }
  }

  // ===== TICKET PRINTING =====

  async getPrintFormat(ticketId: string): Promise<ITicketPrintFormat> {
    const startTime = Date.now();
    this.logger.log(`Generating print format for ticket ${ticketId}`, 'TicketService.getPrintFormat');

    try {
      // Obtener ticket
      const ticket = await this.findOne(ticketId);
      
      // Obtener configuración del negocio
      this.logger.debug('Loading business configuration', 'TicketService.getPrintFormat');
      const businessConfig = await this.businessConfigService.getActiveConfig();
      
      // Formatear fecha y hora
      const ticketDate = new Date(ticket.createdAt);
      const formattedDate = ticketDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const formattedTime = ticketDate.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Formatear número de ticket
      const ticketNumber = `TKT-${ticket.id.substring(0, 8).toUpperCase()}`;

      // Obtener símbolo de moneda
      const currencySymbol = this.getCurrencySymbol(businessConfig.currency);

      const printFormat: ITicketPrintFormat = {
        header: {
          businessName: businessConfig.businessName,
          businessAddress: businessConfig.businessAddress,
          businessPhone: businessConfig.businessPhone,
          businessTaxId: businessConfig.businessTaxId,
          businessEmail: businessConfig.businessEmail,
          businessLogo: businessConfig.businessLogo
        },
        ticket: {
          ticketNumber: ticketNumber,
          employeeName: ticket.employeeName,
          barName: ticket.barName,
          eventName: ticket.eventName,
          date: formattedDate,
          time: formattedTime,
          currency: businessConfig.currency
        },
        items: ticket.items.map(item => ({
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          taxRate: item.taxRate,
          tax: item.tax
        })),
        totals: {
          subtotal: ticket.subtotal,
          tax: ticket.totalTax,
          total: ticket.total,
          currency: businessConfig.currency
        },
        payment: {
          method: this.getPaymentMethodText(ticket.paymentMethod),
          paidAmount: ticket.paidAmount || 0,
          changeAmount: ticket.changeAmount || 0,
          currency: businessConfig.currency
        },
        footer: {
          thankYouMessage: businessConfig.thankYouMessage,
          businessWebsite: businessConfig.businessWebsite,
          receiptFooter: businessConfig.receiptFooter
        },
        printerSettings: {
          paperWidth: businessConfig.printerSettings.paperWidth,
          fontSize: businessConfig.printerSettings.fontSize,
          fontFamily: businessConfig.printerSettings.fontFamily
        }
      };

      const duration = Date.now() - startTime;
      this.logger.log(`Print format generated successfully for ticket ${ticketId} in ${duration}ms`, 'TicketService.getPrintFormat');

      return printFormat;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        this.logger.warn(`Error generating print format after ${duration}ms: ${error.message}`, 'TicketService.getPrintFormat');
        throw error;
      }

      this.logger.error(`Unexpected error generating print format after ${duration}ms:`, error.stack, 'TicketService.getPrintFormat');
      throw new BadRequestException('Unable to generate print format at this time. Please try again later.');
    }
  }

  async markAsPrinted(ticketId: string): Promise<void> {
    try {
      await this.dynamoDBService.update(
        TABLE_NAMES.TICKETS,
        { PK: `TICKET#${ticketId}`, SK: `TICKET#${ticketId}` },
        'SET #printed = :printed, #updatedAt = :updatedAt',
        {
          ':printed': true,
          ':updatedAt': new Date().toISOString(),
        },
        {
          '#printed': 'printed',
          '#updatedAt': 'updatedAt',
        }
      );
    } catch (error) {
      console.error('Error marking ticket as printed:', error);
      throw new BadRequestException('Failed to mark ticket as printed. Please try again.');
    }
  }

  private getPaymentMethodText(method?: string): string {
    switch (method) {
      case 'cash': return 'EFECTIVO';
      case 'card': return 'TARJETA';
      case 'mixed': return 'MIXTO';
      default: return 'PENDIENTE';
    }
  }

  private getCurrencySymbol(currency: string): string {
    switch (currency.toUpperCase()) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'MXN': return '$';
      case 'PEN': return 'S/';
      case 'COP': return '$';
      case 'ARS': return '$';
      case 'BRL': return 'R$';
      default: return '$';
    }
  }
}
