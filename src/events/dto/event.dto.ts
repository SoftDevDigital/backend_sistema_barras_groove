import { IsString, IsNotEmpty, MinLength, IsEnum, IsOptional, IsDateString } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(['active', 'closed'])
  @IsOptional()
  status?: 'active' | 'closed';
}

export class EventQueryDto {
  @IsEnum(['active', 'closed'])
  @IsOptional()
  status?: 'active' | 'closed';

  @IsString()
  @IsOptional()
  search?: string;
}
