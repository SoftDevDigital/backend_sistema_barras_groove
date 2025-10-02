import { BaseModel } from './base.model';
import { IEvent, IEventCreate } from '../interfaces/event.interface';

export class EventModel extends BaseModel implements IEvent {
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'closed';

  constructor(data?: IEventCreate) {
    super();
    
    if (data) {
      this.name = data.name;
      this.startDate = data.startDate;
      this.endDate = data.endDate;
      this.status = 'active';
    } else {
      this.name = '';
      this.startDate = '';
      this.endDate = '';
      this.status = 'active';
    }
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      PK: `EVENT#${this.id}`,
      SK: `EVENT#${this.id}`,
      GSI1PK: `EVENT#${this.status}`,
      GSI1SK: this.startDate,
      id: this.id,
      name: this.name,
      startDate: this.startDate,
      endDate: this.endDate,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): EventModel {
    const event = new EventModel();
    
    event.id = item.id;
    event.name = item.name;
    event.startDate = item.startDate;
    event.endDate = item.endDate;
    event.status = item.status;
    event.createdAt = item.createdAt;
    event.updatedAt = item.updatedAt;
    
    return event;
  }
}
