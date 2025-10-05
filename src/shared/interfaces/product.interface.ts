export interface IProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  quickKey: string | null;
  code: string; // Código de 2-3 letras para bartender (ej: CCC, FER)
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  barcode?: string;
  taxRate: number;
  available: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IProductCreate {
  name: string;
  description?: string;
  price: number;
  cost?: number;
  quickKey?: string;
  code: string; // Código de 2-3 letras para bartender (ej: CCC, FER)
  category?: string;
  unit?: string;
  stock?: number;
  minStock?: number;
  barcode?: string;
  taxRate?: number;
  available?: boolean;
  active?: boolean;
}

export interface IProductUpdate {
  name?: string;
  description?: string;
  price?: number;
  cost?: number;
  quickKey?: string;
  code?: string; // Código de 2-3 letras para bartender (ej: CCC, FER)
  category?: string;
  unit?: string;
  stock?: number;
  minStock?: number;
  barcode?: string;
  taxRate?: number;
  available?: boolean;
  active?: boolean;
}

export interface IProductKey {
  productId: string;
  productName: string;
  price: number;
  quickKey: string;
  code: string; // Código de 2-3 letras para bartender
  stock: number;
  available: boolean;
}

export interface IBarProduct {
  barId: string;
  productId: string;
  quickKey: string;
  assignedAt: string;
}

export interface IProductStockUpdate {
  productId: string;
  quantity: number;
  type: 'add' | 'subtract' | 'set';
  reason?: string;
}

export interface IProductStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  alertType: 'low_stock' | 'out_of_stock';
}
