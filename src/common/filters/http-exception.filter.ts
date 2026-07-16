import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorResponse = exception.getResponse() as
      | string
      | { message: string | string[]; error: string; statusCode: number };

    const message =
      typeof errorResponse === 'string'
        ? errorResponse
        : Array.isArray(errorResponse.message)
        ? errorResponse.message.join(', ')
        : errorResponse.message || exception.message;

    const errorCode =
      typeof errorResponse === 'object' && 'error' in errorResponse
        ? errorResponse.error
        : HttpStatus[status];

    this.logger.warn(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception.stack,
    );

    response.status(status).json({
      statusCode: status,
      error: errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}