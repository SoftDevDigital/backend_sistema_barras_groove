import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    try {
      if (exception instanceof HttpException) {
        status = exception.getStatus();
        message = exception.message;
      } else if (exception instanceof Error) {
        message = exception.message;
        this.logger.error(`Unexpected error: ${exception.message}`, exception.stack);
      } else {
        // Error completamente desconocido
        this.logger.error('Unknown error type:', exception);
        message = 'An unexpected error occurred';
      }

      const errorResponse = {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message: message,
      };

      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
      );

      // Asegurar que la respuesta se envíe correctamente
      if (!response.headersSent) {
        response.status(status).json(errorResponse);
      }
    } catch (filterError) {
      // Si el filtro de errores falla, enviar respuesta básica
      this.logger.error('Error in exception filter:', filterError);
      
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
