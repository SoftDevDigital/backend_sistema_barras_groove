import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DynamoDBService } from '../../shared/services/dynamodb.service';
import { BarModel } from '../../shared/models/bar.model';
import { CreateBarDto, UpdateBarDto, BarQueryDto } from '../dto/bar.dto';
import { IBar, IBarCreate } from '../../shared/interfaces/bar.interface';
import { TABLE_NAMES } from '../../shared/config/dynamodb.config';

@Injectable()
export class BarService {
  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async create(createBarDto: CreateBarDto): Promise<IBar> {
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
}
