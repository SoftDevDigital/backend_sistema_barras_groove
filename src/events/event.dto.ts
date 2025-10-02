import { IsString, IsDateString, IsEnum, IsOptional } from 'class-validator';

export class CreateEventDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(['active', 'closed'])
  status?: 'active' | 'closed';
}
