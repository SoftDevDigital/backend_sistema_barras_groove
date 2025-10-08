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
    let errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      if (exception instanceof HttpException) {
        status = exception.getStatus();
        
        // Manejar diferentes tipos de errores HTTP con mensajes mejorados
        if (exception instanceof BadRequestException) {
          shouldLogAsError = false; // Errores de validación son esperados
          const exceptionResponse = exception.getResponse();
          if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            message = exceptionResponse['message'] || exception.message;
            // Si hay errores de validación específicos, incluirlos
            if (exceptionResponse['errors']) {
              message = {
                message: message,
                errors: exceptionResponse['errors'],
                errorId: errorId
              };
            } else {
              message = {
                message: message,
                errorId: errorId
              };
            }
          } else {
            message = {
              message: exception.message,
              errorId: errorId
            };
          }
        } else if (exception instanceof NotFoundException) {
          shouldLogAsError = false; // Recursos no encontrados son esperados
          message = {
            message: exception.message,
            errorId: errorId
          };
        } else if (exception instanceof UnauthorizedException || 
                   exception instanceof ForbiddenException) {
          shouldLogAsError = false; // Errores de autenticación son esperados
          message = {
            message: exception.message,
            errorId: errorId
          };
        } else if (exception instanceof ConflictException) {
          shouldLogAsError = false; // Conflictos son esperados
          message = {
            message: exception.message,
            errorId: errorId
          };
        } else {
          message = {
            message: exception.message,
            errorId: errorId
          };
        }
      } else if (exception instanceof Error) {
        // Solo loggear errores 500+ (errores de servidor)
        this.logger.error(`[${errorId}] Unexpected error:`, exception.stack, 'HttpExceptionFilter');
        message = {
          message: 'An unexpected error occurred. Please try again later.',
          errorId: errorId,
          details: process.env.NODE_ENV === 'development' ? exception.message : undefined
        };
      } else {
        // Error completamente desconocido - siempre loggear
        this.logger.error(`[${errorId}] Unknown error type:`, JSON.stringify(exception), 'HttpExceptionFilter');
        message = {
          message: 'An unexpected error occurred. Please try again later.',
          errorId: errorId
        };
      }

      const errorResponse = {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message: message,
      };

      // Log de la respuesta de error solo para errores 500+
      if (status >= 500) {
        const logMessage = typeof message === 'string' ? message : JSON.stringify(message);
        this.logger.apiCall(request.method, request.url, status, `[${errorId}] ${logMessage}`);
      }

      // Asegurar que la respuesta se envíe correctamente
      if (!response.headersSent) {
        response.status(status).json(errorResponse);
      } else {
        this.logger.warn(`[${errorId}] Response already sent, cannot send error response`, 'HttpExceptionFilter');
      }
    } catch (filterError) {
      // Si el filtro de errores falla, enviar respuesta básica
      this.logger.error(`[${errorId}] Critical error in exception filter:`, filterError instanceof Error ? filterError.stack : JSON.stringify(filterError), 'HttpExceptionFilter');
      
      try {
        if (!response.headersSent) {
          response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error - please contact support',
            errorId: errorId,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (responseError) {
        // Si incluso la respuesta básica falla, solo loggear
        this.logger.error(`[${errorId}] CRITICAL: Cannot send any response to client:`, responseError instanceof Error ? responseError.stack : JSON.stringify(responseError), 'HttpExceptionFilter');
      }
    }
  }
}
