import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

/**
 * Global HTTP exception filter for error handling
 */
@Catch(HttpException)
@Injectable()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly config: ConfigService;

  constructor(config: ConfigService) {
    this.config = config;
  }

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
    const safeData = this.getSafeStructuredData(exceptionResponse);

    const isDevelopment = this.config.get<string>('nodeEnv') === 'development';

    // Client errors (4xx)
    if (status >= 400 && status < 500) {
      response.status(status).json({
        success: false,
        status: 'fail',
        statusCode: status,
        message,
        data:
          safeData ??
          (typeof exceptionResponse === 'object' ? exceptionResponse : null),
        timestamp,
        path: request.url,
      });
      return;
    }

    // Server errors (5xx)
    this.logger.error('Unhandled HTTP exception:', exception);

    response.status(status).json({
      success: false,
      status: 'error',
      statusCode: status,
      message,
      data:
        safeData ??
        (isDevelopment
          ? {
              stack: exception.stack,
            }
          : null),
      timestamp,
      path: request.url,
    });
  }

  private getSafeStructuredData(
    value: unknown,
  ): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.code !== 'string') {
      return null;
    }
    return {
      code: record.code,
      message: typeof record.message === 'string' ? record.message : undefined,
      retryable:
        typeof record.retryable === 'boolean' ? record.retryable : undefined,
      details:
        record.details && typeof record.details === 'object'
          ? record.details
          : undefined,
    };
  }
}
