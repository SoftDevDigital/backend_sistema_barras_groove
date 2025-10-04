import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsEnum, 
  IsNumber, 
  Min, 
  Max, 
  IsUUID, 
  IsBoolean,
  IsDateString,
  ValidateNested,
  IsArray
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTicketDto {
  @IsUUID()
  @IsNotEmpty()
  barId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateTicketDto {
  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(['open', 'paid', 'cancelled', 'refunded'])
  @IsOptional()
  status?: 'open' | 'paid' | 'cancelled' | 'refunded';
}

export class AddTicketItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  @Max(999)
  quantity: number;
}

export class UpdateTicketItemDto {
  @IsNumber()
  @Min(1)
  @Max(999)
  quantity: number;
}

export class ProcessPaymentDto {
  @IsEnum(['cash', 'card', 'mixed'])
  @IsNotEmpty()
  paymentMethod: 'cash' | 'card' | 'mixed';

  @IsNumber()
  @Min(0.01)
  paidAmount: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  changeAmount?: number;
}

export class TicketQueryDto {
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @IsUUID()
  @IsOptional()
  barId?: string;

  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsEnum(['open', 'paid', 'cancelled', 'refunded'])
  @IsOptional()
  status?: 'open' | 'paid' | 'cancelled' | 'refunded';

  @IsEnum(['cash', 'card', 'mixed'])
  @IsOptional()
  paymentMethod?: 'cash' | 'card' | 'mixed';

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsBoolean()
  @IsOptional()
  printed?: boolean;

  @IsString()
  @IsOptional()
  search?: string;
}

export class TicketStatsQueryDto {
  @IsUUID()
  @IsOptional()
  employeeId?: string;

  @IsUUID()
  @IsOptional()
  barId?: string;

  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  topProducts?: number;
}
