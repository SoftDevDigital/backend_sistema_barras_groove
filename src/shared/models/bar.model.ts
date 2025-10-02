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
      PK: { S: `BAR#${this.id}` },
      SK: { S: `BAR#${this.id}` },
      GSI1PK: { S: `EVENT#${this.eventId}` },
      GSI1SK: { S: `BAR#${this.id}` },
      GSI2PK: { S: `BAR#${this.status}` },
      GSI2SK: { S: this.createdAt },
      ...super.toDynamoDBItem(),
      name: { S: this.name },
      eventId: { S: this.eventId },
      printer: { S: this.printer },
      status: { S: this.status },
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): BarModel {
    const bar = new BarModel();
    const data = BaseModel.fromDynamoDBItem(item);
    
    bar.id = data.id;
    bar.name = data.name;
    bar.eventId = data.eventId;
    bar.printer = data.printer;
    bar.status = data.status;
    bar.createdAt = data.createdAt;
    bar.updatedAt = data.updatedAt;
    
    return bar;
  }
}
