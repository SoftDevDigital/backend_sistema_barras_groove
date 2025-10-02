import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access denied. No authentication token provided. Please log in first.');
    }

    try {
      const payload = this.jwtService.verify(token);
      
      // Validar que el payload tenga los campos necesarios
      if (!payload.sub || !payload.email || !payload.role) {
        throw new UnauthorizedException('Access denied. Invalid token format. Please log in again.');
      }
      
      request['user'] = payload;
      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access denied. Your session has expired. Please log in again.');
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Access denied. Invalid authentication token. Please log in again.');
      } else {
        throw new UnauthorizedException('Access denied. Authentication failed. Please log in again.');
      }
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
