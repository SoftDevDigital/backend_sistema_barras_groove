import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DynamoDBService } from '../../shared/services/dynamodb.service';
import { UserModel } from '../../shared/models/user.model';
import { LoginDto, RegisterDto, UpdateUserRoleDto, UserQueryDto } from '../dto/auth.dto';
import { IAuthResponse, IUser } from '../../shared/interfaces/user.interface';
import { TABLE_NAMES } from '../../shared/config/dynamodb.config';

@Injectable()
export class AuthService {
  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<IAuthResponse> {
    // Validar entrada
    if (!registerDto.email || !registerDto.password || !registerDto.name) {
      throw new BadRequestException('Email, password, and name are required');
    }

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

    // Create user with default role 'bartender' if not specified
    const userModel = new UserModel({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      role: registerDto.role || 'bartender',
      document: registerDto.document,
      contact: registerDto.contact,
      employeeRole: registerDto.employeeRole,
    });

    await this.dynamoDBService.put(TABLE_NAMES.USERS, userModel.toDynamoDBItem());

    // Generate JWT
    const token = this.jwtService.sign({
      sub: userModel.id,
      email: userModel.email,
      name: userModel.name,
      role: userModel.role,
    });

    return {
      token,
      user: {
        id: userModel.id,
        email: userModel.email,
        name: userModel.name,
        role: userModel.role,
        document: userModel.document,
        contact: userModel.contact,
        employeeRole: userModel.employeeRole,
        createdAt: userModel.createdAt,
        updatedAt: userModel.updatedAt,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<IAuthResponse> {
    // Validar entrada
    if (!loginDto.email || !loginDto.password) {
      throw new BadRequestException('Email and password are required');
    }

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
      name: user.name,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        document: user.document,
        contact: user.contact,
        employeeRole: user.employeeRole,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async validateUser(userId: string): Promise<any> {
    // Validar entrada
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

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

  // ===== GESTIÓN DE USUARIOS (Solo Admin) =====

  async findAllUsers(query: UserQueryDto = {}): Promise<Omit<IUser, 'password'>[]> {
    try {
      let items: any[] = [];

      if (query.role) {
        // Buscar por rol usando GSI1
        items = await this.dynamoDBService.query(
          TABLE_NAMES.USERS,
          'GSI1PK = :gsi1pk',
          { ':gsi1pk': `ROLE#${query.role}` },
          undefined,
          'GSI1'
        );
      } else if (query.search) {
        // Buscar por nombre o email usando scan
        items = await this.dynamoDBService.scan(
          TABLE_NAMES.USERS,
          'contains(name, :search) OR contains(email, :search)',
          { ':search': query.search }
        );
      } else {
        // Obtener todos los usuarios
        items = await this.dynamoDBService.scan(TABLE_NAMES.USERS);
      }

      return items.map(item => {
        const { password, ...userWithoutPassword } = item;
        return userWithoutPassword as Omit<IUser, 'password'>;
      });
    } catch (error) {
      console.error('Error finding users:', error);
      throw new BadRequestException('Failed to retrieve users. Please try again.');
    }
  }

  async findUserById(id: string): Promise<Omit<IUser, 'password'> | null> {
    try {
      if (!id) {
        throw new BadRequestException('User ID is required');
      }

      console.log(`[AuthService] Searching for user with ID: ${id}`);

      // Buscar por ID usando scan ya que el PK/SK usa email
      const items = await this.dynamoDBService.scan(
        TABLE_NAMES.USERS,
        'id = :id',
        { ':id': id }
      );
      
      console.log(`[AuthService] Found ${items.length} users with ID ${id}`);
      
      const item = items.length > 0 ? items[0] : null;
      
      if (!item) {
        console.warn(`[AuthService] User with ID ${id} not found in database`);
        return null;
      }

      console.log(`[AuthService] User found: ${item.name} (${item.email})`);

      const { password, ...userWithoutPassword } = item;
      return userWithoutPassword as Omit<IUser, 'password'>;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error finding user:', error);
      throw new BadRequestException('Failed to retrieve user. Please try again.');
    }
  }

  async updateUserRole(userId: string, updateRoleDto: UpdateUserRoleDto): Promise<Omit<IUser, 'password'>> {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      // Verificar que el usuario existe
      const existingUser = await this.findUserById(userId);

      if (!existingUser) {
        throw new BadRequestException('User not found');
      }

      // Preparar datos de actualización
      const updateData = {
        role: updateRoleDto.role,
        updatedAt: new Date().toISOString(),
        GSI1PK: `ROLE#${updateRoleDto.role}`,
      };

      await this.dynamoDBService.update(
        TABLE_NAMES.USERS,
        { PK: `USER#${existingUser.email}`, SK: `USER#${existingUser.email}` },
        'SET #role = :role, #updatedAt = :updatedAt, #GSI1PK = :GSI1PK',
        {
          ':role': updateRoleDto.role,
          ':updatedAt': updateData.updatedAt,
          ':GSI1PK': updateData.GSI1PK,
        },
        {
          '#role': 'role',
          '#updatedAt': 'updatedAt',
          '#GSI1PK': 'GSI1PK',
        }
      );

      // Retornar usuario actualizado
      const updatedUser = await this.findUserById(userId);
      if (!updatedUser) {
        throw new BadRequestException('Failed to retrieve updated user');
      }
      
      return updatedUser;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error updating user role:', error);
      throw new BadRequestException('Failed to update user role. Please try again.');
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      // Verificar que el usuario existe
      const existingUser = await this.findUserById(userId);

      if (!existingUser) {
        throw new BadRequestException('User not found');
      }

      await this.dynamoDBService.delete(TABLE_NAMES.USERS, {
        PK: `USER#${existingUser.email}`,
        SK: `USER#${existingUser.email}`,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error deleting user:', error);
      throw new BadRequestException('Failed to delete user. Please try again.');
    }
  }
}
