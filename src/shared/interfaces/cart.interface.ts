export interface ICartItem {
  productId: string;
  productName: string;
  productCode: string; // Código del producto (ej: CCC, FER)
  price: number;
  quantity: number;
  total: number; // price * quantity
  unit: string;
}

export interface ICart {
  id: string;
  userId: string; // ID del usuario (antes bartenderId)
  userName: string; // Nombre del usuario (antes bartenderName)
  eventId: string;
  items: ICartItem[];
  subtotal: number; // Suma de todos los totales de items
  tax: number; // Impuestos calculados
  total: number; // subtotal + tax
  status: 'active' | 'confirmed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface IAddToCartRequest {
  productCode: string; // Código del producto (ej: CCC2, FER1)
  quantity?: number; // Si no se especifica, se extrae del código
}

export interface IAddToCartResponse {
  success: boolean;
  message: string;
  cartItem?: ICartItem;
  cartTotal?: number;
  error?: string;
}

export interface ICartSummary {
  totalItems: number;
  totalQuantity: number;
  subtotal: number;
  tax: number;
  total: number;
  items: ICartItem[];
}

export interface IConfirmCartRequest {
  barId: string; // ID de la barra donde se realiza la venta
  customerName?: string;
  customerEmail?: string;
  paymentMethod?: 'cash' | 'card' | 'mixed' | 'administrator';
  notes?: string;
}

export interface IConfirmCartResponse {
  success: boolean;
  ticketId?: string;
  message: string;
  printFormat?: any; // Formato de impresión del ticket
  error?: string;
}

// Para el endpoint de entrada del bartender
export interface IBartenderInput {
  input: string; // Formato: "CCC2" o "FER1"
}

export interface IBartenderInputResponse {
  success: boolean;
  message: string;
  product?: {
    name: string;
    code: string;
    price: number;
    quantity: number;
    total: number;
  };
  cartSummary?: ICartSummary;
  error?: string;
}
