import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto, RegisterDto } from '../dto/auth.dto';
import { IAuthResponse } from '../../shared/interfaces/user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<IAuthResponse> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<IAuthResponse> {
    return this.authService.register(registerDto);
  }
}
