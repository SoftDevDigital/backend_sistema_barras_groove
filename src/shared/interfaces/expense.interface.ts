export interface IExpense {
  id: string;
  eventId: string;
  type: 'supplies' | 'staff' | 'equipment' | 'other';
  amount: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface IExpenseCreate {
  eventId: string;
  type: 'supplies' | 'staff' | 'equipment' | 'other';
  amount: number;
  description: string;
}

export interface IExpenseUpdate {
  type?: 'supplies' | 'staff' | 'equipment' | 'other';
  amount?: number;
  description?: string;
}
