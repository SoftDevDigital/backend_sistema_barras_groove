import { BaseModel } from './base.model';
import { IBar, IBarCreate } from '../interfaces/bar.interface';

export class BarModel extends BaseModel implements IBar {
  name: string;
  eventId: string;
  printer: string;
  status: 'active' | 'closed';

  constructor(data?: IBarCreate) {
    super();
    
    if (data) {
      this.name = data.name;
      this.eventId = data.eventId;
      this.printer = data.printer;
      this.status = 'active';
    } else {
      this.name = '';
      this.eventId = '';
      this.printer = '';
      this.status = 'active';
    }
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      PK: `BAR#${this.id}`,
      SK: `BAR#${this.id}`,
      GSI1PK: `EVENT#${this.eventId}`,
      GSI1SK: `BAR#${this.id}`,
      GSI2PK: `BAR#${this.status}`,
      GSI2SK: this.createdAt,
      id: this.id,
      name: this.name,
      eventId: this.eventId,
      printer: this.printer,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): BarModel {
    const bar = new BarModel();
    
    bar.id = item.id;
    bar.name = item.name;
    bar.eventId = item.eventId;
    bar.printer = item.printer;
    bar.status = item.status;
    bar.createdAt = item.createdAt;
    bar.updatedAt = item.updatedAt;
    
    return bar;
  }
}
