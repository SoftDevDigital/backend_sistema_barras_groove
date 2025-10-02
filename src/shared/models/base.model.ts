import { v4 as uuidv4 } from 'uuid';

export abstract class BaseModel {
  id: string;
  createdAt: string;
  updatedAt: string;

  constructor() {
    this.id = uuidv4();
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  updateTimestamp(): void {
    this.updatedAt = new Date().toISOString();
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): any {
    // Con DynamoDBDocumentClient, los datos ya vienen en formato JSON normal
    return {
      id: item.id,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
