import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomLoggerService } from '../services/logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new CustomLoggerService();

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let shouldLogAsError = true;

    try {
      if (exception instanceof HttpException) {
        status = exception.getStatus();
        message = exception.message;

        // Determinar si debe loggearse como error o warning basado en el tipo
        if (exception instanceof BadRequestException) {
          shouldLogAsError = false; // Errores de validación son esperados
        } else if (exception instanceof NotFoundException) {
          shouldLogAsError = false; // Recursos no encontrados son esperados
        } else if (exception instanceof UnauthorizedException || 
                   exception instanceof ForbiddenException) {
          shouldLogAsError = false; // Errores de autenticación son esperados
        } else if (exception instanceof ConflictException) {
          shouldLogAsError = false; // Conflictos son esperados
        }
      } else if (exception instanceof Error) {
        message = exception.message;
        // Solo loggear como error si es realmente inesperado
        this.logger.error(`Unexpected error: ${exception.message}`, exception.stack, 'HttpExceptionFilter');
      } else {
        // Error completamente desconocido
        this.logger.error('Unknown error type:', undefined, 'HttpExceptionFilter');
        this.logger.error(`Error details: ${JSON.stringify(exception)}`, undefined, 'HttpExceptionFilter');
        message = 'An unexpected error occurred';
      }

      const errorResponse = {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message: message,
      };

      // Usar el nuevo logger para API calls
      this.logger.apiCall(request.method, request.url, status, message);

      // Asegurar que la respuesta se envíe correctamente
      if (!response.headersSent) {
        response.status(status).json(errorResponse);
      }
    } catch (filterError) {
      // Si el filtro de errores falla, enviar respuesta básica
      this.logger.error('Error in exception filter:', undefined, 'HttpExceptionFilter');
      
      if (!response.headersSent) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
}
