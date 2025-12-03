// Interfaces para el módulo de Tickets

export interface ITicketItem {
  id: string;
  ticketId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface ITicketItemCreate {
  productId: string;
  quantity: number;
}

export interface ITicketItemUpdate {
  quantity?: number;
}

export interface ITicket {
  id: string;
  userId: string; // ID del usuario (antes employeeId)
  userName: string; // Nombre del usuario (antes employeeName)
  barId: string;
  barName: string;
  eventId: string;
  eventName: string;
  status: 'open' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod?: 'cash' | 'card' | 'mixed' | 'administrator' | 'dj';
  subtotal: number;
  totalTax: number;
  total: number;
  paidAmount?: number;
  changeAmount?: number;
  items: ITicketItem[];
  notes?: string;
  printed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ITicketCreate {
  barId: string;
  notes?: string;
}

export interface ITicketUpdate {
  notes?: string;
  status?: 'open' | 'paid' | 'cancelled' | 'refunded';
}

export interface ITicketPayment {
  paymentMethod: 'cash' | 'card' | 'mixed' | 'administrator' | 'dj';
  paidAmount: number;
  changeAmount?: number;
}

export interface ITicketQuery {
  userId?: string; // ID del usuario (antes employeeId)
  barId?: string;
  eventId?: string;
  status?: 'open' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod?: 'cash' | 'card' | 'mixed' | 'administrator' | 'dj';
  dateFrom?: string;
  dateTo?: string;
  printed?: boolean;
}

export interface ITicketStats {
  total: number;
  open: number;
  paid: number;
  cancelled: number;
  refunded: number;
  totalRevenue: number;
  averageTicketValue: number;
  mostSoldProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface ITicketPrintFormat {
  header: {
    businessName: string;
    businessAddress: string;
    businessPhone: string;
    businessTaxId: string;
    businessEmail?: string;
    businessLogo?: string;
  };
  ticket: {
    ticketNumber: string;
    userName: string; // Nombre del usuario (antes employeeName)
    barName: string;
    eventName: string;
    date: string;
    time: string;
    currency: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    taxRate: number;
    tax: number;
  }>;
  totals: {
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
  };
  payment: {
    method: string;
    paidAmount: number;
    changeAmount: number;
    currency: string;
  };
  footer: {
    thankYouMessage: string;
    businessWebsite: string;
    receiptFooter: string;
  };
  printerSettings: {
    paperWidth: number;
    fontSize: number;
    fontFamily: string;
  };
}