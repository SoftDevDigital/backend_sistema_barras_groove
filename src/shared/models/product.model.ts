import { BaseModel } from './base.model';
import { IProduct, IProductCreate, IProductUpdate } from '../interfaces/product.interface';

export class ProductModel extends BaseModel implements IProduct {
  public name: string;
  public description?: string;
  public price: number;
  public cost?: number;
  public quickKey: string | null;
  public category: string;
  public unit: string;
  public stock: number;
  public minStock: number;
  public barcode?: string;
  public taxRate: number;
  public available: boolean;
  public active: boolean;

  constructor(data: IProductCreate & { id?: string; createdAt?: string; updatedAt?: string }) {
    super();
    this.id = data.id || this.id; // Usar el ID generado por BaseModel
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.cost = data.cost;
    this.quickKey = data.quickKey || null;
    this.category = data.category || 'General';
    this.unit = data.unit || 'unidad';
    this.stock = data.stock || 0;
    this.minStock = data.minStock || 0;
    this.barcode = data.barcode;
    this.taxRate = data.taxRate || 0;
    this.available = data.available !== undefined ? data.available : true;
    this.active = data.active !== undefined ? data.active : true;
    this.createdAt = data.createdAt || this.createdAt;
    this.updatedAt = data.updatedAt || this.updatedAt;
  }

  // Métodos para DynamoDB
  public toDynamoDB(): Record<string, any> {
    return {
      PK: `PRODUCT#${this.id}`,
      SK: `PRODUCT#${this.id}`,
      GSI1PK: this.active ? 'ACTIVE_PRODUCTS' : 'INACTIVE_PRODUCTS',
      GSI1SK: this.name,
      GSI2PK: this.quickKey ? `KEY#${this.quickKey}` : 'NO_KEY',
      GSI2SK: this.id,
      GSI3PK: this.category,
      GSI3SK: this.name,
      // Campos del producto
      name: this.name,
      description: this.description,
      price: this.price,
      cost: this.cost,
      quickKey: this.quickKey,
      category: this.category,
      unit: this.unit,
      stock: this.stock,
      minStock: this.minStock,
      barcode: this.barcode,
      taxRate: this.taxRate,
      available: this.available,
      active: this.active,
      ...this.toDynamoDBItem(),
    };
  }

  public static fromDynamoDB(item: Record<string, any>): ProductModel {
    const product = new ProductModel({
      id: item.PK ? item.PK.replace('PRODUCT#', '') : item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      cost: item.cost,
      quickKey: item.quickKey || null,
      category: item.category || 'General',
      unit: item.unit || 'unidad',
      stock: item.stock || 0,
      minStock: item.minStock || 0,
      barcode: item.barcode,
      taxRate: item.taxRate || 0,
      available: item.available !== undefined ? item.available : true,
      active: item.active,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });

    return product;
  }

  // Método para actualizar
  public update(updateData: IProductUpdate): void {
    if (updateData.name !== undefined) {
      this.name = updateData.name;
    }
    if (updateData.description !== undefined) {
      this.description = updateData.description;
    }
    if (updateData.price !== undefined) {
      this.price = updateData.price;
    }
    if (updateData.cost !== undefined) {
      this.cost = updateData.cost;
    }
    if (updateData.quickKey !== undefined) {
      this.quickKey = updateData.quickKey;
    }
    if (updateData.category !== undefined) {
      this.category = updateData.category;
    }
    if (updateData.unit !== undefined) {
      this.unit = updateData.unit;
    }
    if (updateData.stock !== undefined) {
      this.stock = updateData.stock;
    }
    if (updateData.minStock !== undefined) {
      this.minStock = updateData.minStock;
    }
    if (updateData.barcode !== undefined) {
      this.barcode = updateData.barcode;
    }
    if (updateData.taxRate !== undefined) {
      this.taxRate = updateData.taxRate;
    }
    if (updateData.available !== undefined) {
      this.available = updateData.available;
    }
    if (updateData.active !== undefined) {
      this.active = updateData.active;
    }
    this.updatedAt = new Date().toISOString();
  }

  // Validaciones
  public validate(): string[] {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('Product name is required');
    }

    if (this.name && this.name.length > 100) {
      errors.push('Product name must be less than 100 characters');
    }

    if (this.price === undefined || this.price === null) {
      errors.push('Product price is required');
    }

    if (this.price < 0) {
      errors.push('Product price must be positive');
    }

    if (this.cost !== undefined && this.cost < 0) {
      errors.push('Product cost must be positive');
    }

    if (this.quickKey && this.quickKey.length > 10) {
      errors.push('Quick key must be less than 10 characters');
    }

    // Category y unit tienen valores por defecto, no necesitan validación

    if (this.stock < 0) {
      errors.push('Stock cannot be negative');
    }

    if (this.minStock < 0) {
      errors.push('Minimum stock cannot be negative');
    }

    if (this.taxRate < 0 || this.taxRate > 100) {
      errors.push('Tax rate must be between 0 and 100');
    }

    return errors;
  }

  // Método para verificar si la tecla rápida es válida
  public isValidQuickKey(): boolean {
    if (!this.quickKey) return true; // null es válido
    return /^[A-Z0-9]+$/.test(this.quickKey) && this.quickKey.length <= 10;
  }

  // Métodos para manejo de stock
  public addStock(quantity: number): void {
    this.stock += quantity;
    this.updatedAt = new Date().toISOString();
  }

  public subtractStock(quantity: number): boolean {
    if (this.stock >= quantity) {
      this.stock -= quantity;
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  public setStock(quantity: number): void {
    this.stock = quantity;
    this.updatedAt = new Date().toISOString();
  }

  public isLowStock(): boolean {
    return this.stock <= this.minStock;
  }

  public isOutOfStock(): boolean {
    return this.stock <= 0;
  }

  public isAvailableForSale(): boolean {
    return this.active && this.available && this.stock > 0;
  }

  public getMargin(): number {
    if (this.cost && this.price > this.cost) {
      return this.price - this.cost;
    }
    return 0;
  }

  public getMarginPercentage(): number {
    if (this.cost && this.price > this.cost) {
      return ((this.price - this.cost) / this.cost) * 100;
    }
    return 0;
  }

  public getPriceWithTax(): number {
    return this.price * (1 + this.taxRate / 100);
  }
}
