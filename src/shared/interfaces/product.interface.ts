export interface IProduct {
  id: string;
  name: string;
  price: number;
  quickKey: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IProductCreate {
  name: string;
  price: number;
  quickKey?: string;
  active?: boolean;
}

export interface IProductUpdate {
  name?: string;
  price?: number;
  quickKey?: string;
  active?: boolean;
}

export interface IProductKey {
  productId: string;
  productName: string;
  price: number;
  quickKey: string;
}

export interface IBarProduct {
  barId: string;
  productId: string;
  quickKey: string;
  assignedAt: string;
}
