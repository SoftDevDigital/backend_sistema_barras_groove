import { IsEmail, IsString, MinLength, IsEnum, IsOptional, Matches } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(['admin', 'bartender'])
  @IsOptional()
  role?: 'admin' | 'bartender'; // Por defecto será 'bartender'

  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{7,15}$/, { message: 'Document must be 7-15 digits only' })
  document?: string;

  @IsString()
  @IsOptional()
  contact?: string; // Si no se proporciona, se usa el email

  @IsEnum(['bartender', 'manager', 'cashier'])
  @IsOptional()
  employeeRole?: 'bartender' | 'manager' | 'cashier'; // Rol como empleado
}

export class UpdateUserRoleDto {
  @IsEnum(['admin', 'bartender'])
  role: 'admin' | 'bartender';
}

export class UserQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(['admin', 'bartender'])
  @IsOptional()
  role?: 'admin' | 'bartender';
}
