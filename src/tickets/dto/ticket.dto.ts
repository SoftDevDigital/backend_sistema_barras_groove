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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddTicketItemDto)
  @IsOptional()
  items?: AddTicketItemDto[];

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsEnum(['cash', 'card', 'mixed', 'administrator', 'dj'])
  @IsOptional()
  paymentMethod?: 'cash' | 'card' | 'mixed' | 'administrator' | 'dj';

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
  @IsEnum(['cash', 'card', 'mixed', 'administrator', 'dj'])
  @IsNotEmpty()
  paymentMethod: 'cash' | 'card' | 'mixed' | 'administrator' | 'dj';

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
  userId?: string; // ID del usuario (antes employeeId)

  @IsUUID()
  @IsOptional()
  barId?: string;

  @IsUUID()
  @IsOptional()
  eventId?: string;

  @IsEnum(['open', 'paid', 'cancelled', 'refunded'])
  @IsOptional()
  status?: 'open' | 'paid' | 'cancelled' | 'refunded';

  @IsEnum(['cash', 'card', 'mixed', 'administrator', 'dj'])
  @IsOptional()
  paymentMethod?: 'cash' | 'card' | 'mixed' | 'administrator' | 'dj';

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
  userId?: string; // ID del usuario (antes employeeId)

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
