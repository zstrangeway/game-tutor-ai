import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message?: string | string[];
  error?: string;
  [key: string]: any;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();

    const errorObj: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(typeof errorResponse === 'object'
        ? errorResponse
        : { message: errorResponse }),
    };

    // Log detailed error information
    this.logger.error(
      `HTTP Exception: ${status} - ${request.method} ${request.url}`,
      typeof errorResponse === 'object'
        ? ((errorResponse as Record<string, unknown>).message as string) ||
            exception.message
        : exception.message,
    );

    // Mask sensitive errors in production
    if (
      process.env.NODE_ENV === 'production' &&
      status === HttpStatus.INTERNAL_SERVER_ERROR.valueOf()
    ) {
      errorObj.message = 'Internal server error';
      delete errorObj.error;
    }

    response.status(status).json(errorObj);
  }
}
