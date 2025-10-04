import { BaseModel } from './base.model';
import {
  IStockMovement,
  IStockMovementCreate,
  IBarStock,
  IBarStockCreate,
  IGlobalStock,
  IGlobalStockUpdate,
  IStockAlert,
  IStockTransfer,
  IStockTransferCreate
} from '../interfaces/stock.interface';

// Modelo para movimientos de stock
export class StockMovementModel extends BaseModel implements IStockMovement {
  productId: string;
  productName: string;
  barId?: string;
  barName?: string;
  eventId?: string;
  eventName?: string;
  type: 'initial' | 'replenish' | 'transfer' | 'sale' | 'adjustment' | 'final';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  ticketId?: string;
  recordedBy: string;
  recordedByName: string;
  GSI1PK: string; // For product movements
  GSI1SK: string; // For date within product
  GSI2PK: string; // For bar movements
  GSI2SK: string; // For date within bar
  GSI3PK: string; // For event movements
  GSI3SK: string; // For date within event

  constructor(data?: IStockMovementCreate & {
    productName?: string;
    barName?: string;
    eventName?: string;
    previousQuantity?: number;
    newQuantity?: number;
    ticketId?: string;
    recordedByName?: string;
  }) {
    super();
    
    if (data) {
      this.productId = data.productId;
      this.productName = data.productName || '';
      this.barId = data.barId;
      this.barName = data.barName;
      this.eventId = data.eventId;
      this.eventName = data.eventName;
      this.type = data.type;
      this.quantity = data.quantity;
      this.previousQuantity = data.previousQuantity || 0;
      this.newQuantity = data.newQuantity || data.quantity;
      this.reason = data.reason;
      this.ticketId = data.ticketId;
      this.recordedBy = data.recordedBy || '';
      this.recordedByName = data.recordedByName || '';
    } else {
      this.productId = '';
      this.productName = '';
      this.barId = undefined;
      this.barName = undefined;
      this.eventId = undefined;
      this.eventName = undefined;
      this.type = 'initial';
      this.quantity = 0;
      this.previousQuantity = 0;
      this.newQuantity = 0;
      this.reason = undefined;
      this.ticketId = undefined;
      this.recordedBy = '';
      this.recordedByName = '';
    }

    // Configurar GSI keys
    this.GSI1PK = `PRODUCT#${this.productId}`;
    this.GSI1SK = `MOVEMENT#${this.createdAt}`;
    this.GSI2PK = this.barId ? `BAR#${this.barId}` : '';
    this.GSI2SK = this.barId ? `MOVEMENT#${this.createdAt}` : '';
    this.GSI3PK = this.eventId ? `EVENT#${this.eventId}` : '';
    this.GSI3SK = this.eventId ? `MOVEMENT#${this.createdAt}` : '';
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      PK: `MOVEMENT#${this.id}`,
      SK: `MOVEMENT#${this.id}`,
      GSI1PK: this.GSI1PK,
      GSI1SK: this.GSI1SK,
      GSI2PK: this.GSI2PK,
      GSI2SK: this.GSI2SK,
      GSI3PK: this.GSI3PK,
      GSI3SK: this.GSI3SK,
      ...super.toDynamoDBItem(),
      productId: this.productId,
      productName: this.productName,
      barId: this.barId,
      barName: this.barName,
      eventId: this.eventId,
      eventName: this.eventName,
      type: this.type,
      quantity: this.quantity,
      previousQuantity: this.previousQuantity,
      newQuantity: this.newQuantity,
      reason: this.reason,
      ticketId: this.ticketId,
      recordedBy: this.recordedBy,
      recordedByName: this.recordedByName,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): StockMovementModel {
    const movement = new StockMovementModel();
    movement.id = item.id;
    movement.productId = item.productId;
    movement.productName = item.productName;
    movement.barId = item.barId;
    movement.barName = item.barName;
    movement.eventId = item.eventId;
    movement.eventName = item.eventName;
    movement.type = item.type;
    movement.quantity = item.quantity;
    movement.previousQuantity = item.previousQuantity;
    movement.newQuantity = item.newQuantity;
    movement.reason = item.reason;
    movement.ticketId = item.ticketId;
    movement.recordedBy = item.recordedBy;
    movement.recordedByName = item.recordedByName;
    movement.createdAt = item.createdAt;
    movement.updatedAt = item.updatedAt;
    movement.GSI1PK = item.GSI1PK;
    movement.GSI1SK = item.GSI1SK;
    movement.GSI2PK = item.GSI2PK;
    movement.GSI2SK = item.GSI2SK;
    movement.GSI3PK = item.GSI3PK;
    movement.GSI3SK = item.GSI3SK;
    return movement;
  }
}

// Modelo para stock por barra
export class BarStockModel extends BaseModel implements IBarStock {
  productId: string;
  productName: string;
  barId: string;
  barName: string;
  eventId: string;
  eventName: string;
  initialStock: number;
  currentStock: number;
  finalStock?: number;
  totalSold: number;
  totalReplenished: number;
  totalTransferred: number;
  lastMovement: string;
  status: 'active' | 'closed' | 'pending';
  GSI1PK: string; // For bar queries
  GSI1SK: string; // For product within bar
  GSI2PK: string; // For event queries
  GSI2SK: string; // For bar within event
  GSI3PK: string; // For product queries
  GSI3SK: string; // For bar within product

  constructor(data?: IBarStockCreate & {
    productName?: string;
    barName?: string;
    eventName?: string;
    currentStock?: number;
    totalSold?: number;
    totalReplenished?: number;
    totalTransferred?: number;
    lastMovement?: string;
    status?: 'active' | 'closed' | 'pending';
  }) {
    super();
    
    if (data) {
      this.productId = data.productId;
      this.productName = data.productName || '';
      this.barId = data.barId;
      this.barName = data.barName || '';
      this.eventId = data.eventId;
      this.eventName = data.eventName || '';
      this.initialStock = data.initialStock;
      this.currentStock = data.currentStock || data.initialStock;
      this.finalStock = data.finalStock;
      this.totalSold = data.totalSold || 0;
      this.totalReplenished = data.totalReplenished || 0;
      this.totalTransferred = data.totalTransferred || 0;
      this.lastMovement = data.lastMovement || new Date().toISOString();
      this.status = data.status || 'active';
    } else {
      this.productId = '';
      this.productName = '';
      this.barId = '';
      this.barName = '';
      this.eventId = '';
      this.eventName = '';
      this.initialStock = 0;
      this.currentStock = 0;
      this.finalStock = undefined;
      this.totalSold = 0;
      this.totalReplenished = 0;
      this.totalTransferred = 0;
      this.lastMovement = new Date().toISOString();
      this.status = 'pending';
    }

    // Configurar GSI keys
    this.GSI1PK = `BAR#${this.barId}`;
    this.GSI1SK = `STOCK#${this.productId}`;
    this.GSI2PK = `EVENT#${this.eventId}`;
    this.GSI2SK = `STOCK#${this.barId}#${this.productId}`;
    this.GSI3PK = `PRODUCT#${this.productId}`;
    this.GSI3SK = `STOCK#${this.barId}`;
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      PK: `BAR_STOCK#${this.id}`,
      SK: `BAR_STOCK#${this.id}`,
      GSI1PK: this.GSI1PK,
      GSI1SK: this.GSI1SK,
      GSI2PK: this.GSI2PK,
      GSI2SK: this.GSI2SK,
      GSI3PK: this.GSI3PK,
      GSI3SK: this.GSI3SK,
      ...super.toDynamoDBItem(),
      productId: this.productId,
      productName: this.productName,
      barId: this.barId,
      barName: this.barName,
      eventId: this.eventId,
      eventName: this.eventName,
      initialStock: this.initialStock,
      currentStock: this.currentStock,
      finalStock: this.finalStock,
      totalSold: this.totalSold,
      totalReplenished: this.totalReplenished,
      totalTransferred: this.totalTransferred,
      lastMovement: this.lastMovement,
      status: this.status,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): BarStockModel {
    const barStock = new BarStockModel();
    barStock.id = item.id;
    barStock.productId = item.productId;
    barStock.productName = item.productName;
    barStock.barId = item.barId;
    barStock.barName = item.barName;
    barStock.eventId = item.eventId;
    barStock.eventName = item.eventName;
    barStock.initialStock = item.initialStock;
    barStock.currentStock = item.currentStock;
    barStock.finalStock = item.finalStock;
    barStock.totalSold = item.totalSold;
    barStock.totalReplenished = item.totalReplenished;
    barStock.totalTransferred = item.totalTransferred;
    barStock.lastMovement = item.lastMovement;
    barStock.status = item.status;
    barStock.createdAt = item.createdAt;
    barStock.updatedAt = item.updatedAt;
    barStock.GSI1PK = item.GSI1PK;
    barStock.GSI1SK = item.GSI1SK;
    barStock.GSI2PK = item.GSI2PK;
    barStock.GSI2SK = item.GSI2SK;
    barStock.GSI3PK = item.GSI3PK;
    barStock.GSI3SK = item.GSI3SK;
    return barStock;
  }

  // Métodos de negocio
  addStock(quantity: number): void {
    this.currentStock += quantity;
    this.totalReplenished += quantity;
    this.lastMovement = new Date().toISOString();
  }

  subtractStock(quantity: number): void {
    if (this.currentStock < quantity) {
      throw new Error(`Insufficient stock. Available: ${this.currentStock}, requested: ${quantity}`);
    }
    this.currentStock -= quantity;
    this.totalSold += quantity;
    this.lastMovement = new Date().toISOString();
  }

  transferStock(quantity: number): void {
    if (this.currentStock < quantity) {
      throw new Error(`Insufficient stock for transfer. Available: ${this.currentStock}, requested: ${quantity}`);
    }
    this.currentStock -= quantity;
    this.totalTransferred += quantity;
    this.lastMovement = new Date().toISOString();
  }

  receiveStock(quantity: number): void {
    this.currentStock += quantity;
    this.lastMovement = new Date().toISOString();
  }

  setFinalStock(quantity: number): void {
    this.finalStock = quantity;
    this.status = 'closed';
    this.lastMovement = new Date().toISOString();
  }
}

// Modelo para stock global
export class GlobalStockModel extends BaseModel implements IGlobalStock {
  productId: string;
  productName: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  minStock: number;
  maxStock?: number;
  lastUpdated: string;

  constructor(data?: {
    productId: string;
    productName?: string;
    totalStock?: number;
    reservedStock?: number;
    availableStock?: number;
    minStock?: number;
    maxStock?: number;
  }) {
    super();
    
    if (data) {
      this.productId = data.productId;
      this.productName = data.productName || '';
      this.totalStock = data.totalStock || 0;
      this.reservedStock = data.reservedStock || 0;
      this.availableStock = data.availableStock || 0;
      this.minStock = data.minStock || 0;
      this.maxStock = data.maxStock;
      this.lastUpdated = new Date().toISOString();
    } else {
      this.productId = '';
      this.productName = '';
      this.totalStock = 0;
      this.reservedStock = 0;
      this.availableStock = 0;
      this.minStock = 0;
      this.maxStock = undefined;
      this.lastUpdated = new Date().toISOString();
    }
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      PK: `GLOBAL_STOCK#${this.id}`,
      SK: `GLOBAL_STOCK#${this.id}`,
      GSI1PK: `PRODUCT#${this.productId}`,
      GSI1SK: `GLOBAL_STOCK#${this.lastUpdated}`,
      ...super.toDynamoDBItem(),
      productId: this.productId,
      productName: this.productName,
      totalStock: this.totalStock,
      reservedStock: this.reservedStock,
      availableStock: this.availableStock,
      minStock: this.minStock,
      maxStock: this.maxStock,
      lastUpdated: this.lastUpdated,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): GlobalStockModel {
    const globalStock = new GlobalStockModel();
    globalStock.id = item.id;
    globalStock.productId = item.productId;
    globalStock.productName = item.productName;
    globalStock.totalStock = item.totalStock;
    globalStock.reservedStock = item.reservedStock;
    globalStock.availableStock = item.availableStock;
    globalStock.minStock = item.minStock;
    globalStock.maxStock = item.maxStock;
    globalStock.lastUpdated = item.lastUpdated;
    globalStock.createdAt = item.createdAt;
    globalStock.updatedAt = item.updatedAt;
    return globalStock;
  }

  // Métodos de negocio
  updateAvailableStock(): void {
    this.availableStock = this.totalStock - this.reservedStock;
    this.lastUpdated = new Date().toISOString();
  }

  reserveStock(quantity: number): void {
    if (this.availableStock < quantity) {
      throw new Error(`Insufficient available stock. Available: ${this.availableStock}, requested: ${quantity}`);
    }
    this.reservedStock += quantity;
    this.updateAvailableStock();
  }

  releaseStock(quantity: number): void {
    if (this.reservedStock < quantity) {
      throw new Error(`Insufficient reserved stock. Reserved: ${this.reservedStock}, requested: ${quantity}`);
    }
    this.reservedStock -= quantity;
    this.updateAvailableStock();
  }

  addStock(quantity: number): void {
    this.totalStock += quantity;
    this.updateAvailableStock();
  }

  subtractStock(quantity: number): void {
    if (this.totalStock < quantity) {
      throw new Error(`Insufficient total stock. Total: ${this.totalStock}, requested: ${quantity}`);
    }
    this.totalStock -= quantity;
    this.updateAvailableStock();
  }

  isLowStock(): boolean {
    return this.availableStock <= this.minStock;
  }

  isOutOfStock(): boolean {
    return this.availableStock <= 0;
  }
}

// Modelo para alertas de stock
export class StockAlertModel extends BaseModel implements IStockAlert {
  productId: string;
  productName: string;
  barId?: string;
  barName?: string;
  type: 'low_stock' | 'out_of_stock' | 'over_stock' | 'negative_stock';
  currentStock: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  GSI1PK: string; // For product alerts
  GSI1SK: string; // For date within product
  GSI2PK: string; // For bar alerts
  GSI2SK: string; // For date within bar

  constructor(data?: {
    productId: string;
    productName?: string;
    barId?: string;
    barName?: string;
    type: 'low_stock' | 'out_of_stock' | 'over_stock' | 'negative_stock';
    currentStock: number;
    threshold: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    message?: string;
    acknowledged?: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: string;
  }) {
    super();
    
    if (data) {
      this.productId = data.productId;
      this.productName = data.productName || '';
      this.barId = data.barId;
      this.barName = data.barName;
      this.type = data.type;
      this.currentStock = data.currentStock;
      this.threshold = data.threshold;
      this.severity = data.severity || 'medium';
      this.message = data.message || this.generateMessage(data.type, data.currentStock, data.threshold);
      this.acknowledged = data.acknowledged || false;
      this.acknowledgedBy = data.acknowledgedBy;
      this.acknowledgedAt = data.acknowledgedAt;
    } else {
      this.productId = '';
      this.productName = '';
      this.barId = undefined;
      this.barName = undefined;
      this.type = 'low_stock';
      this.currentStock = 0;
      this.threshold = 0;
      this.severity = 'medium';
      this.message = '';
      this.acknowledged = false;
      this.acknowledgedBy = undefined;
      this.acknowledgedAt = undefined;
    }

    // Configurar GSI keys
    this.GSI1PK = `PRODUCT#${this.productId}`;
    this.GSI1SK = `ALERT#${this.createdAt}`;
    this.GSI2PK = this.barId ? `BAR#${this.barId}` : '';
    this.GSI2SK = this.barId ? `ALERT#${this.createdAt}` : '';
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      PK: `STOCK_ALERT#${this.id}`,
      SK: `STOCK_ALERT#${this.id}`,
      GSI1PK: this.GSI1PK,
      GSI1SK: this.GSI1SK,
      GSI2PK: this.GSI2PK,
      GSI2SK: this.GSI2SK,
      ...super.toDynamoDBItem(),
      productId: this.productId,
      productName: this.productName,
      barId: this.barId,
      barName: this.barName,
      type: this.type,
      currentStock: this.currentStock,
      threshold: this.threshold,
      severity: this.severity,
      message: this.message,
      acknowledged: this.acknowledged,
      acknowledgedBy: this.acknowledgedBy,
      acknowledgedAt: this.acknowledgedAt,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): StockAlertModel {
    const alert = new StockAlertModel();
    alert.id = item.id;
    alert.productId = item.productId;
    alert.productName = item.productName;
    alert.barId = item.barId;
    alert.barName = item.barName;
    alert.type = item.type;
    alert.currentStock = item.currentStock;
    alert.threshold = item.threshold;
    alert.severity = item.severity;
    alert.message = item.message;
    alert.acknowledged = item.acknowledged;
    alert.acknowledgedBy = item.acknowledgedBy;
    alert.acknowledgedAt = item.acknowledgedAt;
    alert.createdAt = item.createdAt;
    alert.updatedAt = item.updatedAt;
    alert.GSI1PK = item.GSI1PK;
    alert.GSI1SK = item.GSI1SK;
    alert.GSI2PK = item.GSI2PK;
    alert.GSI2SK = item.GSI2SK;
    return alert;
  }

  private generateMessage(type: string, current: number, threshold: number): string {
    switch (type) {
      case 'low_stock':
        return `Stock bajo: ${current} unidades disponibles (mínimo: ${threshold})`;
      case 'out_of_stock':
        return `Sin stock: 0 unidades disponibles`;
      case 'over_stock':
        return `Stock excesivo: ${current} unidades (máximo recomendado: ${threshold})`;
      case 'negative_stock':
        return `Stock negativo: ${current} unidades (verificar inventario)`;
      default:
        return `Alerta de stock: ${current} unidades`;
    }
  }

  acknowledge(acknowledgedBy: string): void {
    this.acknowledged = true;
    this.acknowledgedBy = acknowledgedBy;
    this.acknowledgedAt = new Date().toISOString();
  }
}

// Modelo para transferencias de stock
export class StockTransferModel extends BaseModel implements IStockTransfer {
  productId: string;
  productName: string;
  fromBarId: string;
  fromBarName: string;
  toBarId: string;
  toBarName: string;
  eventId: string;
  eventName: string;
  quantity: number;
  reason?: string;
  requestedBy: string;
  requestedByName: string;
  approvedBy?: string;
  approvedByName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  GSI1PK: string; // For product transfers
  GSI1SK: string; // For date within product
  GSI2PK: string; // For event transfers
  GSI2SK: string; // For date within event

  constructor(data?: IStockTransferCreate & {
    productName?: string;
    fromBarName?: string;
    toBarName?: string;
    eventName?: string;
    requestedByName?: string;
    approvedByName?: string;
    status?: 'pending' | 'approved' | 'rejected' | 'completed';
  }) {
    super();
    
    if (data) {
      this.productId = data.productId;
      this.productName = data.productName || '';
      this.fromBarId = data.fromBarId;
      this.fromBarName = data.fromBarName || '';
      this.toBarId = data.toBarId;
      this.toBarName = data.toBarName || '';
      this.eventId = data.eventId;
      this.eventName = data.eventName || '';
      this.quantity = data.quantity;
      this.reason = data.reason;
      this.requestedBy = data.requestedBy || '';
      this.requestedByName = data.requestedByName || '';
      this.approvedBy = data.approvedBy;
      this.approvedByName = data.approvedByName;
      this.status = data.status || 'pending';
    } else {
      this.productId = '';
      this.productName = '';
      this.fromBarId = '';
      this.fromBarName = '';
      this.toBarId = '';
      this.toBarName = '';
      this.eventId = '';
      this.eventName = '';
      this.quantity = 0;
      this.reason = undefined;
      this.requestedBy = '';
      this.requestedByName = '';
      this.approvedBy = undefined;
      this.approvedByName = undefined;
      this.status = 'pending';
    }

    // Configurar GSI keys
    this.GSI1PK = `PRODUCT#${this.productId}`;
    this.GSI1SK = `TRANSFER#${this.createdAt}`;
    this.GSI2PK = `EVENT#${this.eventId}`;
    this.GSI2SK = `TRANSFER#${this.createdAt}`;
  }

  toDynamoDBItem(): Record<string, any> {
    return {
      PK: `STOCK_TRANSFER#${this.id}`,
      SK: `STOCK_TRANSFER#${this.id}`,
      GSI1PK: this.GSI1PK,
      GSI1SK: this.GSI1SK,
      GSI2PK: this.GSI2PK,
      GSI2SK: this.GSI2SK,
      ...super.toDynamoDBItem(),
      productId: this.productId,
      productName: this.productName,
      fromBarId: this.fromBarId,
      fromBarName: this.fromBarName,
      toBarId: this.toBarId,
      toBarName: this.toBarName,
      eventId: this.eventId,
      eventName: this.eventName,
      quantity: this.quantity,
      reason: this.reason,
      requestedBy: this.requestedBy,
      requestedByName: this.requestedByName,
      approvedBy: this.approvedBy,
      approvedByName: this.approvedByName,
      status: this.status,
    };
  }

  static fromDynamoDBItem(item: Record<string, any>): StockTransferModel {
    const transfer = new StockTransferModel();
    transfer.id = item.id;
    transfer.productId = item.productId;
    transfer.productName = item.productName;
    transfer.fromBarId = item.fromBarId;
    transfer.fromBarName = item.fromBarName;
    transfer.toBarId = item.toBarId;
    transfer.toBarName = item.toBarName;
    transfer.eventId = item.eventId;
    transfer.eventName = item.eventName;
    transfer.quantity = item.quantity;
    transfer.reason = item.reason;
    transfer.requestedBy = item.requestedBy;
    transfer.requestedByName = item.requestedByName;
    transfer.approvedBy = item.approvedBy;
    transfer.approvedByName = item.approvedByName;
    transfer.status = item.status;
    transfer.createdAt = item.createdAt;
    transfer.updatedAt = item.updatedAt;
    transfer.GSI1PK = item.GSI1PK;
    transfer.GSI1SK = item.GSI1SK;
    transfer.GSI2PK = item.GSI2PK;
    transfer.GSI2SK = item.GSI2SK;
    return transfer;
  }

  approve(approvedBy: string, approvedByName: string): void {
    this.status = 'approved';
    this.approvedBy = approvedBy;
    this.approvedByName = approvedByName;
    this.updatedAt = new Date().toISOString();
  }

  reject(approvedBy: string, approvedByName: string, reason?: string): void {
    this.status = 'rejected';
    this.approvedBy = approvedBy;
    this.approvedByName = approvedByName;
    if (reason) this.reason = reason;
    this.updatedAt = new Date().toISOString();
  }

  complete(): void {
    this.status = 'completed';
    this.updatedAt = new Date().toISOString();
  }
}
