import { IsString, IsNotEmpty, MinLength, IsEnum, IsOptional, IsEmail, Matches } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{7,15}$/, { message: 'Document must be 7-15 digits only' })
  document: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail({}, { message: 'Contact must be a valid email address' })
  contact: string;

  @IsEnum(['bartender', 'manager', 'cashier'])
  role: 'bartender' | 'manager' | 'cashier';
}

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  @MinLength(2)
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{7,15}$/, { message: 'Document must be 7-15 digits only' })
  document?: string;

  @IsString()
  @IsOptional()
  @IsEmail({}, { message: 'Contact must be a valid email address' })
  contact?: string;

  @IsEnum(['bartender', 'manager', 'cashier'])
  @IsOptional()
  role?: 'bartender' | 'manager' | 'cashier';
}

export class EmployeeQueryDto {
  @IsString()
  @IsOptional()
  eventId?: string;

  @IsString()
  @IsOptional()
  barId?: string;

  @IsEnum(['bartender', 'manager', 'cashier'])
  @IsOptional()
  role?: 'bartender' | 'manager' | 'cashier';

  @IsString()
  @IsOptional()
  search?: string;
}

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  barId: string;

  @IsEnum(['morning', 'afternoon', 'night'])
  shift: 'morning' | 'afternoon' | 'night';
}

export class UpdateAssignmentDto {
  @IsString()
  @IsOptional()
  barId?: string;

  @IsEnum(['morning', 'afternoon', 'night'])
  @IsOptional()
  shift?: 'morning' | 'afternoon' | 'night';

  @IsEnum(['active', 'completed'])
  @IsOptional()
  status?: 'active' | 'completed';
}

export class AssignmentQueryDto {
  @IsString()
  @IsOptional()
  eventId?: string;

  @IsString()
  @IsOptional()
  barId?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsEnum(['morning', 'afternoon', 'night'])
  @IsOptional()
  shift?: 'morning' | 'afternoon' | 'night';

  @IsEnum(['active', 'completed'])
  @IsOptional()
  status?: 'active' | 'completed';
}
