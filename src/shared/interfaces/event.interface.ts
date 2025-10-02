export interface IEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface IEventCreate {
  name: string;
  startDate: string;
  endDate: string;
}

export interface IEventUpdate {
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: 'active' | 'closed';
}

export interface IEventReport {
  eventId: string;
  totalIncome: number;
  totalExpenses: number;
  margin: number;
  productRankings: Array<{
    productId: string;
    productName: string;
    totalSold: number;
    totalRevenue: number;
  }>;
  employeeProductivity: Array<{
    employeeId: string;
    employeeName: string;
    totalTickets: number;
    totalRevenue: number;
  }>;
  generatedAt: string;
}
