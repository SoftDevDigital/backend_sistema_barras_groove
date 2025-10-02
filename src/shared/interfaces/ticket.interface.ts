export interface ITicket {
  id: string;
  eventId: string;
  barId: string;
  productId: string;
  employeeId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isReprint: boolean;
  originalTicketId?: string;
  createdAt: string;
}

export interface ITicketCreate {
  eventId: string;
  barId: string;
  productId: string;
  employeeId: string;
  quantity: number;
}

export interface ITicketReprint {
  originalTicketId: string;
  employeeId: string;
}

export interface ITicketWithDetails extends ITicket {
  productName: string;
  employeeName: string;
  barName: string;
  eventName: string;
}
