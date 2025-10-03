import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MaxLength(100, { message: 'Product name must be less than 100 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must be less than 500 characters' })
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price must be positive' })
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Cost must be positive' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'Quick key must be less than 10 characters' })
  @Matches(/^[A-Z0-9]*$/, { message: 'Quick key can only contain uppercase letters and numbers' })
  quickKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Category must be less than 50 characters' })
  @Transform(({ value }) => value || 'General')
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Unit must be less than 20 characters' })
  @Transform(({ value }) => value || 'unidad')
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Stock cannot be negative' })
  @Transform(({ value }) => value ? parseInt(value) : 0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Minimum stock cannot be negative' })
  @Transform(({ value }) => value ? parseInt(value) : 0)
  minStock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Barcode must be less than 50 characters' })
  barcode?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Tax rate cannot be negative' })
  @Max(100, { message: 'Tax rate cannot exceed 100%' })
  @Transform(({ value }) => value ? parseFloat(value) : 0)
  taxRate?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  available?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  active?: boolean;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Product name must be less than 100 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must be less than 500 characters' })
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Price must be positive' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  price?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Cost must be positive' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'Quick key must be less than 10 characters' })
  @Matches(/^[A-Z0-9]*$/, { message: 'Quick key can only contain uppercase letters and numbers' })
  quickKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Category must be less than 50 characters' })
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Unit must be less than 20 characters' })
  unit?: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Stock cannot be negative' })
  @Transform(({ value }) => parseInt(value))
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Minimum stock cannot be negative' })
  @Transform(({ value }) => parseInt(value))
  minStock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Barcode must be less than 50 characters' })
  barcode?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0, { message: 'Tax rate cannot be negative' })
  @Max(100, { message: 'Tax rate cannot exceed 100%' })
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  taxRate?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  available?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  active?: boolean;
}

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  event_id?: string;

  @IsOptional()
  @IsString()
  bar_id?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  active?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  keys_only?: string;

  @IsOptional()
  @IsString()
  status?: 'active' | 'inactive' | 'all';

  @IsOptional()
  @IsString()
  sort_by?: 'name' | 'price' | 'created_at' | 'updated_at' | 'stock' | 'category';

  @IsOptional()
  @IsString()
  sort_order?: 'asc' | 'desc';

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  offset?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  low_stock?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  out_of_stock?: boolean;
}

export class StockUpdateDto {
  @IsNumber()
  @Min(0, { message: 'Quantity must be positive' })
  @Transform(({ value }) => parseInt(value))
  quantity: number;

  @IsString()
  type: 'add' | 'subtract' | 'set';

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Reason must be less than 200 characters' })
  reason?: string;
}
