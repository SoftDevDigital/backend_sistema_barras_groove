import { BaseModel } from './base.model';
import { IExpense, IExpenseCreate } from '../interfaces/expense.interface';

export class ExpenseModel extends BaseModel implements IExpense {
  eventId: string;
  type: 'supplies' | 'staff' | 'equipment' | 'other';
  amount: number;
  description: string;

  constructor(data?: IExpenseCreate) {
    super();
    
    if (data) {
      this.eventId = data.eventId;
      this.type = data.type;
      this.amount = data.amount;
      this.description = data.description;
    } else {
      this.eventId = '';
      this.type = 'other';
      this.amount = 0;
      this.description = '';
    }
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      PK: `EXPENSE#${this.id}`,
      SK: `EXPENSE#${this.id}`,
      GSI1PK: `EVENT#${this.eventId}`,
      GSI1SK: `EXPENSE#${this.createdAt}`,
      GSI2PK: `TYPE#${this.type}`,
      GSI2SK: `EXPENSE#${this.createdAt}`,
      ...super.toDynamoDBItem(),
      eventId: this.eventId,
      type: this.type,
      amount: this.amount,
      description: this.description,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): ExpenseModel {
    const expense = new ExpenseModel();
    
    expense.id = item.id;
    expense.eventId = item.eventId;
    expense.type = item.type;
    expense.amount = item.amount;
    expense.description = item.description;
    expense.createdAt = item.createdAt;
    expense.updatedAt = item.updatedAt;
    
    return expense;
  }

  validate(): string[] {
    const errors: string[] = [];

    if (!this.eventId || this.eventId.trim().length === 0) {
      errors.push('Event ID is required');
    }

    if (!this.type || !['supplies', 'staff', 'equipment', 'other'].includes(this.type)) {
      errors.push('Type must be one of: supplies, staff, equipment, other');
    }

    if (this.amount === undefined || this.amount === null || this.amount < 0) {
      errors.push('Amount must be a positive number');
    }

    if (!this.description || this.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (this.description && this.description.length > 500) {
      errors.push('Description cannot exceed 500 characters');
    }

    return errors;
  }

  updateTimestamp(): void {
    super.updateTimestamp();
  }
}
