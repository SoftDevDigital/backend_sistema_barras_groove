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
    let message: string | object = 'Internal server error';
    let shouldLogAsError = true;

    try {
      if (exception instanceof HttpException) {
        status = exception.getStatus();
        
        // Manejar diferentes tipos de errores HTTP
        if (exception instanceof BadRequestException) {
          shouldLogAsError = false; // Errores de validación son esperados
          const response = exception.getResponse();
          if (typeof response === 'object' && response !== null) {
            message = response['message'] || exception.message;
            // Si hay errores de validación específicos, incluirlos
            if (response['errors']) {
              message = {
                message: message,
                errors: response['errors']
              };
            }
          } else {
            message = exception.message;
          }
        } else if (exception instanceof NotFoundException) {
          shouldLogAsError = false; // Recursos no encontrados son esperados
          message = exception.message;
        } else if (exception instanceof UnauthorizedException || 
                   exception instanceof ForbiddenException) {
          shouldLogAsError = false; // Errores de autenticación son esperados
          message = exception.message;
        } else if (exception instanceof ConflictException) {
          shouldLogAsError = false; // Conflictos son esperados
          message = exception.message;
        } else {
          message = exception.message;
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
      const logMessage = typeof message === 'string' ? message : JSON.stringify(message);
      this.logger.apiCall(request.method, request.url, status, logMessage);

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
