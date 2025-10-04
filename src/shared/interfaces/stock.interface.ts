// Interfaces para el módulo de Stock - Sistema Unificado Optimizado

export interface IStockMovement {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface IStockMovementCreate {
  productId: string;
  barId?: string;
  eventId?: string;
  type: 'initial' | 'replenish' | 'transfer' | 'adjustment';
  quantity: number;
  reason?: string;
  ticketId?: string;
  recordedBy?: string;
}

export interface IStockMovementUpdate {
  quantity?: number;
  reason?: string;
}

export interface IBarStock {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface IBarStockCreate {
  productId: string;
  barId: string;
  eventId: string;
  initialStock: number;
  finalStock?: number;
}

export interface IBarStockUpdate {
  currentStock?: number;
  finalStock?: number;
  status?: 'active' | 'closed' | 'pending';
}

export interface IGlobalStock {
  id: string;
  productId: string;
  productName: string;
  totalStock: number;
  reservedStock: number; // Stock asignado a barras
  availableStock: number; // Stock disponible para asignar
  minStock: number;
  maxStock?: number;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

export interface IGlobalStockUpdate {
  totalStock?: number;
  reservedStock?: number;
  availableStock?: number;
  minStock?: number;
  maxStock?: number;
}

export interface IStockAlert {
  id: string;
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
  createdAt: string;
}

export interface IStockTransfer {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface IStockTransferCreate {
  productId: string;
  fromBarId: string;
  toBarId: string;
  eventId: string;
  quantity: number;
  reason?: string;
  requestedBy?: string;
  approvedBy?: string;
}

export interface IStockTransferUpdate {
  status: 'approved' | 'rejected';
  reason?: string;
}

export interface IStockReport {
  eventId: string;
  eventName: string;
  barId?: string;
  barName?: string;
  productId?: string;
  productName?: string;
  dateFrom: string;
  dateTo: string;
  summary: {
    totalProducts: number;
    totalInitialStock: number;
    totalFinalStock: number;
    totalSold: number;
    totalReplenished: number;
    totalTransferred: number;
    totalDifferences: number;
    totalValue: number;
  };
  products: Array<{
    productId: string;
    productName: string;
    barId?: string;
    barName?: string;
    initialStock: number;
    finalStock: number;
    sold: number;
    replenished: number;
    transferred: number;
    differences: number;
    value: number;
  }>;
  movements: IStockMovement[];
  alerts: IStockAlert[];
}

export interface IStockReportQuery {
  eventId?: string;
  barId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: 'summary' | 'detailed' | 'movements' | 'alerts';
  includeClosed?: boolean;
}

export interface IStockStats {
  totalProducts: number;
  totalStock: number;
  totalReserved: number;
  totalAvailable: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  overStockProducts: number;
  totalValue: number;
  activeAlerts: number;
  pendingTransfers: number;
}

export interface IStockValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}