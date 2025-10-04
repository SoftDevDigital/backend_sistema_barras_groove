import { Controller, Post, Body, HttpCode, HttpStatus, Get, Patch, Param, Query, Delete, UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto, RegisterDto, UpdateUserRoleDto, UserQueryDto } from '../dto/auth.dto';
import { IAuthResponse, IUser } from '../../shared/interfaces/user.interface';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RoleGuard } from '../guards/role.guard';
import { Roles } from '../decorators/roles.decorator';

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

  // ===== GESTIÓN DE USUARIOS (Solo Admin) =====

  @Get('users')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  async findAllUsers(@Query() query: UserQueryDto): Promise<Omit<IUser, 'password'>[]> {
    return this.authService.findAllUsers(query);
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  async findUserById(@Param('id') id: string): Promise<Omit<IUser, 'password'> | null> {
    return this.authService.findUserById(id);
  }

  @Patch('users/:id/role')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  async updateUserRole(
    @Param('id') userId: string,
    @Body() updateRoleDto: UpdateUserRoleDto
  ): Promise<Omit<IUser, 'password'>> {
    return this.authService.updateUserRole(userId, updateRoleDto);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') userId: string): Promise<void> {
    return this.authService.deleteUser(userId);
  }
}
