import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';

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

  @IsEnum(['user'])
  @IsOptional()
  role?: 'user'; // Por defecto será 'user'
}

export class UpdateUserRoleDto {
  @IsEnum(['user', 'admin', 'bartender', 'manager', 'cashier'])
  role: 'user' | 'admin' | 'bartender' | 'manager' | 'cashier';
}

export class UserQueryDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(['user', 'admin', 'bartender', 'manager', 'cashier'])
  @IsOptional()
  role?: 'user' | 'admin' | 'bartender' | 'manager' | 'cashier';
}
