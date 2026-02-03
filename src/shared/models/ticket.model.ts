import { BaseModel } from './base.model';
import { 
  ITicket, 
  ITicketCreate, 
  ITicketItem, 
  ITicketItemCreate 
} from '../interfaces/ticket.interface';

export class TicketItemModel extends BaseModel implements ITicketItem {
  ticketId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  tax: number;
  total: number;

  constructor(data: ITicketItemCreate & { ticketId: string, productName: string, unitPrice: number, taxRate: number }) {
    super();
    this.ticketId = data.ticketId;
    this.productId = data.productId;
    this.productName = data.productName;
    this.quantity = data.quantity;
    this.unitPrice = data.unitPrice;
    this.taxRate = data.taxRate;
    
    // Calcular totales
    this.subtotal = this.unitPrice * this.quantity;
    this.tax = this.subtotal * (this.taxRate / 100);
    this.total = this.subtotal + this.tax;
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      PK: `TICKET#${this.ticketId}`,
      SK: `ITEM#${this.id}`,
      GSI1PK: `PRODUCT#${this.productId}`,
      GSI1SK: `TICKET#${this.ticketId}`,
      ...super.toDynamoDBItem(),
      ticketId: this.ticketId,
      productId: this.productId,
      productName: this.productName,
      quantity: this.quantity,
      unitPrice: this.unitPrice,
      taxRate: this.taxRate,
      subtotal: this.subtotal,
      tax: this.tax,
      total: this.total,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): TicketItemModel {
    const ticketItem = new TicketItemModel({
      ticketId: item.ticketId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
    });
    
    ticketItem.id = item.id;
    ticketItem.createdAt = item.createdAt;
    ticketItem.updatedAt = item.updatedAt;
    
    return ticketItem;
  }

  // Recalcular totales cuando cambie la cantidad
  recalculate(): void {
    this.subtotal = this.unitPrice * this.quantity;
    this.tax = this.subtotal * (this.taxRate / 100);
    this.total = this.subtotal + this.tax;
    this.updateTimestamp();
  }
}

export class TicketModel extends BaseModel implements ITicket {
  userId: string; // ID del usuario (antes employeeId)
  userName: string; // Nombre del usuario (antes employeeName)
  barId: string;
  barName: string;
  eventId: string;
  eventName: string;
  status: 'open' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'administrator' | 'dj';
  subtotal: number;
  totalTax: number;
  total: number;
  paidAmount?: number;
  changeAmount?: number;
  items: ITicketItem[];
  notes?: string;
  printed: boolean;

  constructor(data?: ITicketCreate & { 
    userId: string, 
    userName: string, 
    barId: string, 
    barName: string, 
    eventId: string, 
    eventName: string 
  }) {
    super();
    
    if (data) {
      this.userId = data.userId;
      this.userName = data.userName;
      this.barId = data.barId;
      this.barName = data.barName;
      this.eventId = data.eventId;
      this.eventName = data.eventName;
      this.status = 'open';
      this.subtotal = 0;
      this.totalTax = 0;
      this.total = 0;
      this.items = [];
      this.notes = data.notes;
      this.printed = false;
    } else {
      this.userId = '';
      this.userName = '';
      this.barId = '';
      this.barName = '';
      this.eventId = '';
      this.eventName = '';
      this.status = 'open';
      this.subtotal = 0;
      this.totalTax = 0;
      this.total = 0;
      this.items = [];
      this.notes = '';
      this.printed = false;
    }
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      PK: `TICKET#${this.id}`,
      SK: `TICKET#${this.id}`,
      GSI1PK: `USER#${this.userId}`, // Cambiado de EMPLOYEE a USER
      GSI1SK: `TICKET#${this.createdAt}`,
      GSI2PK: `BAR#${this.barId}`,
      GSI2SK: `TICKET#${this.createdAt}`,
      GSI3PK: `EVENT#${this.eventId}`,
      GSI3SK: `TICKET#${this.createdAt}`,
      ...super.toDynamoDBItem(),
      userId: this.userId,
      userName: this.userName,
      barId: this.barId,
      barName: this.barName,
      eventId: this.eventId,
      eventName: this.eventName,
      status: this.status,
      paymentMethod: this.paymentMethod,
      subtotal: this.subtotal,
      totalTax: this.totalTax,
      total: this.total,
      paidAmount: this.paidAmount,
      changeAmount: this.changeAmount,
      notes: this.notes,
      printed: this.printed,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): TicketModel {
    const ticket = new TicketModel({
      userId: item.userId || item.employeeId, // Compatibilidad con tickets antiguos
      userName: item.userName || item.employeeName,
      barId: item.barId,
      barName: item.barName,
      eventId: item.eventId,
      eventName: item.eventName,
    });
    
    ticket.id = item.id;
    ticket.status = item.status;
    ticket.paymentMethod = item.paymentMethod;
    ticket.subtotal = item.subtotal || 0;
    ticket.totalTax = item.totalTax || 0;
    ticket.total = item.total || 0;
    ticket.paidAmount = item.paidAmount;
    ticket.changeAmount = item.changeAmount;
    ticket.notes = item.notes;
    ticket.printed = item.printed || false;
    ticket.createdAt = item.createdAt;
    ticket.updatedAt = item.updatedAt;
    
    return ticket;
  }

  // Recalcular totales del ticket
  recalculateTotals(): void {
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    this.totalTax = this.items.reduce((sum, item) => sum + item.tax, 0);
    this.total = this.items.reduce((sum, item) => sum + item.total, 0);
    this.updateTimestamp();
  }

  // Agregar item al ticket
  addItem(item: ITicketItem): void {
    this.items.push(item);
    this.recalculateTotals();
  }

  // Remover item del ticket
  removeItem(itemId: string): void {
    this.items = this.items.filter(item => item.id !== itemId);
    this.recalculateTotals();
  }

  // Procesar pago
  processPayment(paymentMethod: 'cash' | 'card' | 'transfer' | 'administrator' | 'dj', paidAmount: number): void {
    this.paymentMethod = paymentMethod;
    this.paidAmount = paidAmount;
    this.changeAmount = paymentMethod === 'cash' ? Math.max(0, paidAmount - this.total) : 0;
    this.status = 'paid';
    this.updateTimestamp();
  }

  // Cancelar ticket
  cancel(): void {
    this.status = 'cancelled';
    this.updateTimestamp();
  }

  // Reembolsar ticket
  refund(): void {
    this.status = 'refunded';
    this.updateTimestamp();
  }
}
