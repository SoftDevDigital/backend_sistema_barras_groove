import { IsString, IsEnum, IsNumber, Min, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty({ message: 'Event ID is required' })
  eventId: string;

  @IsEnum(['supplies', 'staff', 'equipment', 'other'], {
    message: 'Type must be one of: supplies, staff, equipment, other'
  })
  type: 'supplies' | 'staff' | 'equipment' | 'other';

  @IsNumber({}, { message: 'Amount must be a valid number' })
  @Min(0, { message: 'Amount must be a positive number' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsEnum(['supplies', 'staff', 'equipment', 'other'], {
    message: 'Type must be one of: supplies, staff, equipment, other'
  })
  type?: 'supplies' | 'staff' | 'equipment' | 'other';

  @IsOptional()
  @IsNumber({}, { message: 'Amount must be a valid number' })
  @Min(0, { message: 'Amount must be a positive number' })
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;
}

export class ExpenseQueryDto {
  @IsOptional()
  eventId?: string;

  @IsOptional()
  @IsEnum(['supplies', 'staff', 'equipment', 'other'])
  type?: 'supplies' | 'staff' | 'equipment' | 'other';

  @IsOptional()
  search?: string;

  @IsOptional()
  limit?: number;

  @IsOptional()
  offset?: number;

  @IsOptional()
  sort_by?: 'amount' | 'type' | 'createdAt' | 'updatedAt';

  @IsOptional()
  sort_order?: 'asc' | 'desc';

  @IsOptional()
  dateFrom?: string;

  @IsOptional()
  dateTo?: string;
}
