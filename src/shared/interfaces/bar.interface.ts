export interface IBar {
  id: string;
  name: string;
  eventId: string;
  printer: string;
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface IBarCreate {
  name: string;
  eventId: string;
  printer: string;
}

export interface IBarUpdate {
  name?: string;
  printer?: string;
  status?: 'active' | 'closed';
}

export interface IBarReport {
  barId: string;
  barName: string;
  eventId: string;
  totalTickets: number;
  totalRevenue: number;
  products: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  stockSummary: {
    initial: number;
    replenished: number;
    final: number;
    differences: number;
  };
  reprints: number;
  generatedAt: string;
}
