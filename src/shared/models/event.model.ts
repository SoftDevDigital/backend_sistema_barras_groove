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
      PK: { S: `EVENT#${this.id}` },
      SK: { S: `EVENT#${this.id}` },
      GSI1PK: { S: `EVENT#${this.status}` },
      GSI1SK: { S: this.startDate },
      ...super.toDynamoDBItem(),
      name: { S: this.name },
      startDate: { S: this.startDate },
      endDate: { S: this.endDate },
      status: { S: this.status },
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): EventModel {
    const event = new EventModel();
    const data = BaseModel.fromDynamoDBItem(item);
    
    event.id = data.id;
    event.name = data.name;
    event.startDate = data.startDate;
    event.endDate = data.endDate;
    event.status = data.status;
    event.createdAt = data.createdAt;
    event.updatedAt = data.updatedAt;
    
    return event;
  }
}
