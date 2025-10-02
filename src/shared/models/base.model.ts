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
      ...this,
      createdAt: { S: this.createdAt },
      updatedAt: { S: this.updatedAt },
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): any {
    const result: any = {};
    
    for (const [key, value] of Object.entries(item)) {
      if (value.S) {
        result[key] = value.S;
      } else if (value.N) {
        result[key] = Number(value.N);
      } else if (value.BOOL !== undefined) {
        result[key] = value.BOOL;
      } else if (value.NULL) {
        result[key] = null;
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
}
