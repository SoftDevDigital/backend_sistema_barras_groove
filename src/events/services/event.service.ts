import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DynamoDBService } from '../../shared/services/dynamodb.service';
import { EventModel } from '../../shared/models/event.model';
import { CreateEventDto, UpdateEventDto, EventQueryDto } from '../dto/event.dto';
import { IEvent, IEventCreate } from '../../shared/interfaces/event.interface';
import { TABLE_NAMES } from '../../shared/config/dynamodb.config';

@Injectable()
export class EventService {
  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async create(createEventDto: CreateEventDto): Promise<IEvent> {
    // Validar entrada
    if (!createEventDto.name || !createEventDto.startDate || !createEventDto.endDate) {
      throw new BadRequestException('Name, start date, and end date are required');
    }

    // Validar fechas
    const startDate = new Date(createEventDto.startDate);
    const endDate = new Date(createEventDto.endDate);

    // Verificar que las fechas sean válidas
    if (isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid start date format. Please use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)');
    }

    if (isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid end date format. Please use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)');
    }

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Verificar que la fecha de inicio no sea en el pasado (opcional)
    const now = new Date();
    if (startDate < now) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    // Verificar si ya existe un evento con el mismo nombre
    const existingEvent = await this.findByName(createEventDto.name);
    if (existingEvent) {
      throw new ConflictException(`Event '${createEventDto.name}' already exists. Please choose a different name.`);
    }

    // Crear nuevo evento
    const eventModel = new EventModel(createEventDto);
    await this.dynamoDBService.put(TABLE_NAMES.EVENTS, eventModel.toDynamoDBItem());

    return {
      id: eventModel.id,
      name: eventModel.name,
      startDate: eventModel.startDate,
      endDate: eventModel.endDate,
      status: eventModel.status,
      createdAt: eventModel.createdAt,
      updatedAt: eventModel.updatedAt,
    };
  }

  async findAll(query: EventQueryDto = {}): Promise<IEvent[]> {
    let items: any[] = [];

    try {
      if (query.status) {
        // Intentar buscar por status usando GSI2
        try {
          items = await this.dynamoDBService.query(
            TABLE_NAMES.EVENTS,
            'GSI2PK = :gsi2pk',
            {
              ':gsi2pk': `EVENT#${query.status}`,
            },
            undefined,
            'GSI2'
          );
        } catch (error) {
          // Fallback: usar scan si GSI2 no está disponible
          console.warn('GSI2 not available, using scan fallback for status query');
          items = await this.dynamoDBService.scan(
            TABLE_NAMES.EVENTS,
            'begins_with(PK, :pk)',
            {
              ':pk': 'EVENT#',
            }
          );
          // Filtrar por status en memoria
          items = items.filter(item => item.status === query.status);
        }
      } else {
        // Buscar todos los eventos
        items = await this.dynamoDBService.scan(
          TABLE_NAMES.EVENTS,
          'begins_with(PK, :pk)',
          {
            ':pk': 'EVENT#',
          }
        );
      }
    } catch (error) {
      console.error('Error in findAll:', error.message);
      return [];
    }

    // Aplicar filtro de búsqueda si se proporciona
    if (query.search) {
      items = items.filter(item => 
        item.name?.toLowerCase().includes(query.search!.toLowerCase())
      );
    }

    return items.map(item => EventModel.fromDynamoDBItem(item));
  }

  async findOne(id: string): Promise<IEvent> {
    const item = await this.dynamoDBService.get(TABLE_NAMES.EVENTS, {
      PK: `EVENT#${id}`,
      SK: `EVENT#${id}`,
    });

    if (!item) {
      throw new NotFoundException(`Event with ID '${id}' not found. Please verify the event ID and try again.`);
    }

    return EventModel.fromDynamoDBItem(item);
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<IEvent> {
    // Verificar que el evento existe
    const existingEvent = await this.findOne(id);

    // Validar fechas si se están actualizando
    if (updateEventDto.startDate || updateEventDto.endDate) {
      const startDate = new Date(updateEventDto.startDate || existingEvent.startDate);
      const endDate = new Date(updateEventDto.endDate || existingEvent.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Si se está actualizando el nombre, verificar que no exista otro evento con el mismo nombre
    if (updateEventDto.name && updateEventDto.name !== existingEvent.name) {
      const duplicateEvent = await this.findByName(updateEventDto.name);
      if (duplicateEvent && duplicateEvent.id !== id) {
        throw new ConflictException(`Cannot update event '${existingEvent.name}' to '${updateEventDto.name}'. An event with this name already exists. Please choose a different name.`);
      }
    }

    // Actualizar el evento
    const updatedEvent = {
      ...existingEvent,
      ...updateEventDto,
      updatedAt: new Date().toISOString(),
    };

    const eventModel = new EventModel();
    Object.assign(eventModel, updatedEvent);

    await this.dynamoDBService.put(TABLE_NAMES.EVENTS, eventModel.toDynamoDBItem());

    return updatedEvent;
  }

  async remove(id: string): Promise<{ message: string; deletedEvent: IEvent }> {
    // Verificar que el evento existe
    const existingEvent = await this.findOne(id);

    // Eliminar el evento
    await this.dynamoDBService.delete(TABLE_NAMES.EVENTS, {
      PK: `EVENT#${id}`,
      SK: `EVENT#${id}`,
    });

    return {
      message: `Event '${existingEvent.name}' has been successfully deleted`,
      deletedEvent: existingEvent
    };
  }

  async findByStatus(status: 'active' | 'closed'): Promise<IEvent[]> {
    try {
      const items = await this.dynamoDBService.query(
        TABLE_NAMES.EVENTS,
        'GSI2PK = :gsi2pk',
        {
          ':gsi2pk': `EVENT#${status}`,
        },
        undefined,
        'GSI2'
      );
      return items.map(item => EventModel.fromDynamoDBItem(item));
    } catch (error) {
      // Fallback: usar scan si GSI2 no está disponible
      console.warn('GSI2 not available, using scan fallback for findByStatus');
      const items = await this.dynamoDBService.scan(
        TABLE_NAMES.EVENTS,
        'begins_with(PK, :pk)',
        {
          ':pk': 'EVENT#',
        }
      );
      // Filtrar por status en memoria
      const filteredItems = items.filter(item => item.status === status);
      return filteredItems.map(item => EventModel.fromDynamoDBItem(item));
    }
  }

  async changeStatus(id: string, status: 'active' | 'closed'): Promise<IEvent> {
    return this.update(id, { status });
  }

  async getActiveEvents(): Promise<IEvent[]> {
    return this.findByStatus('active');
  }

  async getClosedEvents(): Promise<IEvent[]> {
    return this.findByStatus('closed');
  }

  private async findByName(name: string): Promise<IEvent | null> {
    try {
      const items = await this.dynamoDBService.scan(
        TABLE_NAMES.EVENTS,
        'begins_with(PK, :pk)',
        {
          ':pk': 'EVENT#',
        }
      );

      const filteredItems = items.filter(item => item.name === name);
      return filteredItems.length > 0 ? EventModel.fromDynamoDBItem(filteredItems[0]) : null;
    } catch (error) {
      return null;
    }
  }
}
