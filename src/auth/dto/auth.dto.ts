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

  @IsEnum(['admin', 'bartender'])
  @IsOptional()
  role?: 'admin' | 'bartender'; // Por defecto será 'bartender'
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
