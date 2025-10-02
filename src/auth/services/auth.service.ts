import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DynamoDBService } from '../../shared/services/dynamodb.service';
import { UserModel } from '../../shared/models/user.model';
import { LoginDto, RegisterDto } from '../dto/auth.dto';
import { IAuthResponse } from '../../shared/interfaces/user.interface';
import { TABLE_NAMES } from '../../shared/config/dynamodb.config';

@Injectable()
export class AuthService {
  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<IAuthResponse> {
    // Check if user already exists
    const existingUser = await this.dynamoDBService.get(TABLE_NAMES.USERS, {
      PK: `USER#${registerDto.email}`,
      SK: `USER#${registerDto.email}`,
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const userModel = new UserModel({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      role: registerDto.role,
    });

    await this.dynamoDBService.put(TABLE_NAMES.USERS, userModel.toDynamoDBItem());

    // Generate JWT
    const token = this.jwtService.sign({
      sub: userModel.id,
      email: userModel.email,
      role: userModel.role,
    });

    return {
      token,
      user: {
        id: userModel.id,
        email: userModel.email,
        name: userModel.name,
        role: userModel.role,
        createdAt: userModel.createdAt,
        updatedAt: userModel.updatedAt,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<IAuthResponse> {
    // Find user by email
    const user = await this.dynamoDBService.get(TABLE_NAMES.USERS, {
      PK: `USER#${loginDto.email}`,
      SK: `USER#${loginDto.email}`,
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(loginDto.password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.dynamoDBService.get(TABLE_NAMES.USERS, {
      PK: `USER#${userId}`,
      SK: `USER#${userId}`,
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
