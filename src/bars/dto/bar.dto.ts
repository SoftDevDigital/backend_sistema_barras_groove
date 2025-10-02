import { IsString, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';

export class CreateBarDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  printer: string;
}

export class UpdateBarDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;

  @IsString()
  @IsOptional()
  printer?: string;

  @IsEnum(['active', 'closed'])
  @IsOptional()
  status?: 'active' | 'closed';
}

export class BarQueryDto {
  @IsString()
  @IsOptional()
  eventId?: string;

  @IsEnum(['active', 'closed'])
  @IsOptional()
  status?: 'active' | 'closed';

  @IsString()
  @IsOptional()
  search?: string;
}
