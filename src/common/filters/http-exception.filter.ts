import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

/**
 * Global HTTP exception filter for error handling
 */
@Catch(HttpException)
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly config: ConfigService) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const timestamp = new Date().toISOString();
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as HttpException)?.message ??
          'Internal server error');

    const isDevelopment = this.config.get<string>('nodeEnv') === 'development';

    // Client errors (4xx)
    if (status >= 400 && status < 500) {
      response.status(status).json({
        success: false,
        status: 'fail',
        statusCode: status,
        message,
        data: typeof exceptionResponse === 'object' ? exceptionResponse : null,
        timestamp,
        path: request.url,
      });
      return;
    }

    // Server errors (5xx)
    console.error('Unhandled HTTP exception:', exception);

    response.status(status).json({
      success: false,
      status: 'error',
      statusCode: status,
      message,
      data: isDevelopment
        ? {
            stack: exception.stack,
          }
        : null,
      timestamp,
      path: request.url,
    });
  }
}
