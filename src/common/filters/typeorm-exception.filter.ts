import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';

interface PostgresError {
  code?: string;
  detail?: string;
  table?: string;
}

/**
 * TypeORM exception filter.
 * Handles database errors
 */
@Catch(QueryFailedError, EntityNotFoundError)
@Injectable()
export class TypeOrmExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(TypeOrmExceptionFilter.name);
  private readonly config: ConfigService;

  constructor(config: ConfigService) {
    this.config = config;
  }

  catch(
    exception: QueryFailedError | EntityNotFoundError,
    host: ArgumentsHost,
  ) {
    const timestamp = new Date().toISOString();
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isDevelopment = this.config.get<string>('nodeEnv') === 'development';

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Database error';

    if (exception instanceof EntityNotFoundError) {
      status = HttpStatus.NOT_FOUND;
      message = 'Resource not found';
    } else if (exception instanceof QueryFailedError) {
      // PostgreSQL error codes
      const error = exception as PostgresError;

      // Unique constraint violation
      if (error.code === '23505') {
        status = HttpStatus.CONFLICT;
        message = 'Resource already exists';
      }

      // Foreign key violation
      if (error.code === '23503') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid reference';
      }

      // Not null violation
      if (error.code === '23502') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Required field missing';
      }
    }

    this.logger.error('Database exception:', exception);

    response.status(status).json({
      success: false,
      status: status >= 500 ? 'error' : 'fail',
      statusCode: status,
      message,
      data: isDevelopment
        ? {
            detail: (exception as PostgresError).detail,
            table: (exception as PostgresError).table,
          }
        : null,
      timestamp,
      path: request.url,
    });
  }
}
