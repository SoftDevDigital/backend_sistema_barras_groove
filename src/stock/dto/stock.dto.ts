import { 
  IsString, 
  IsNotEmpty, 
  IsUUID, 
  IsOptional, 
  IsNumber, 
  Min, 
  IsEnum, 
  IsBoolean,
  IsDateString,
  ValidateNested 
} from 'class-validator';
import { Type } from 'class-transformer';

// DTOs para movimientos de stock
export class CreateStockMovementDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsUUID()
  @IsOptional()
  barId?: string;

  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsEnum(['initial', 'replenish', 'transfer', 'adjustment'])
  @IsNotEmpty()
  type: 'initial' | 'replenish' | 'transfer' | 'adjustment';

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  quantity: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsUUID()
  @IsOptional()
  ticketId?: string;
}

export class UpdateStockMovementDto {
  @IsNumber()
  @IsOptional()
  @Min(0.01)
  quantity?: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class StockMovementQueryDto {
  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsUUID()
  @IsOptional()
  barId?: string;

  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsEnum(['initial', 'replenish', 'transfer', 'sale', 'adjustment', 'final'])
  @IsOptional()
  type?: 'initial' | 'replenish' | 'transfer' | 'sale' | 'adjustment' | 'final';

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsUUID()
  @IsOptional()
  ticketId?: string;
}

// DTOs para stock por barra
export class CreateBarStockDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsUUID()
  @IsNotEmpty()
  barId: string;

  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  initialStock: number;
}

export class UpdateBarStockDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  currentStock?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  finalStock?: number;

  @IsEnum(['active', 'closed', 'pending'])
  @IsOptional()
  status?: 'active' | 'closed' | 'pending';
}

export class BarStockQueryDto {
  @IsUUID()
  @IsOptional()
  barId?: string;

  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsEnum(['active', 'closed', 'pending'])
  @IsOptional()
  status?: 'active' | 'closed' | 'pending';

  @IsBoolean()
  @IsOptional()
  lowStock?: boolean;

  @IsBoolean()
  @IsOptional()
  outOfStock?: boolean;
}

// DTOs para stock global
export class UpdateGlobalStockDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  totalStock?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  reservedStock?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  availableStock?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minStock?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxStock?: number;
}

export class GlobalStockQueryDto {
  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsBoolean()
  @IsOptional()
  lowStock?: boolean;

  @IsBoolean()
  @IsOptional()
  outOfStock?: boolean;

  @IsBoolean()
  @IsOptional()
  overStock?: boolean;
}

// DTOs para alertas de stock
export class StockAlertQueryDto {
  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsUUID()
  @IsOptional()
  barId?: string;

  @IsEnum(['low_stock', 'out_of_stock', 'over_stock', 'negative_stock'])
  @IsOptional()
  type?: 'low_stock' | 'out_of_stock' | 'over_stock' | 'negative_stock';

  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  severity?: 'low' | 'medium' | 'high' | 'critical';

  @IsBoolean()
  @IsOptional()
  acknowledged?: boolean;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;
}

export class AcknowledgeAlertDto {
  @IsUUID()
  @IsNotEmpty()
  alertId: string;

  @IsString()
  @IsOptional()
  note?: string;
}

// DTOs para transferencias de stock
export class CreateStockTransferDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsUUID()
  @IsNotEmpty()
  fromBarId: string;

  @IsUUID()
  @IsNotEmpty()
  toBarId: string;

  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  quantity: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateStockTransferDto {
  @IsEnum(['approved', 'rejected'])
  @IsNotEmpty()
  status: 'approved' | 'rejected';

  @IsString()
  @IsOptional()
  reason?: string;
}

export class StockTransferQueryDto {
  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsUUID()
  @IsOptional()
  fromBarId?: string;

  @IsUUID()
  @IsOptional()
  toBarId?: string;

  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsEnum(['pending', 'approved', 'rejected', 'completed'])
  @IsOptional()
  status?: 'pending' | 'approved' | 'rejected' | 'completed';

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;
}

// DTOs para reportes de stock
export class StockReportQueryDto {
  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsUUID()
  @IsOptional()
  barId?: string;

  @IsUUID()
  @IsOptional()
  productId?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsEnum(['summary', 'detailed', 'movements', 'alerts'])
  @IsOptional()
  type?: 'summary' | 'detailed' | 'movements' | 'alerts';

  @IsBoolean()
  @IsOptional()
  includeClosed?: boolean;

  @IsBoolean()
  @IsOptional()
  includeAlerts?: boolean;

  @IsBoolean()
  @IsOptional()
  includeMovements?: boolean;
}

// DTOs para operaciones masivas
export class BulkStockOperationDto {
  @IsEnum(['assign', 'replenish', 'adjust', 'close'])
  @IsNotEmpty()
  operation: 'assign' | 'replenish' | 'adjust' | 'close';

  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @IsUUID()
  @IsOptional()
  barId?: string;

  @ValidateNested({ each: true })
  @Type(() => BulkStockItemDto)
  @IsNotEmpty()
  items: BulkStockItemDto[];
}

export class BulkStockItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  quantity: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

// DTOs para validaciones
export class StockValidationDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsUUID()
  @IsOptional()
  barId?: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  quantity: number;

  @IsEnum(['sale', 'transfer', 'adjustment'])
  @IsNotEmpty()
  operation: 'sale' | 'transfer' | 'adjustment';
}

// DTOs para configuración de stock
export class StockConfigDto {
  @IsBoolean()
  @IsOptional()
  autoReserveStock?: boolean;

  @IsBoolean()
  @IsOptional()
  autoGenerateAlerts?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  defaultMinStock?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  alertThreshold?: number;

  @IsBoolean()
  @IsOptional()
  allowNegativeStock?: boolean;

  @IsBoolean()
  @IsOptional()
  requireApprovalForTransfers?: boolean;
}

// DTOs para estadísticas
export class StockStatsQueryDto {
  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsUUID()
  @IsOptional()
  barId?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsBoolean()
  @IsOptional()
  includeAlerts?: boolean;

  @IsBoolean()
  @IsOptional()
  includeTransfers?: boolean;
}
