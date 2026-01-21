import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Validation exception filter.
 * Handles DTO validation errors
 */
@Catch(BadRequestException)
@Injectable()
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const timestamp = new Date().toISOString();
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse() as BadRequestException;

    // Check if it's a validation error
    if (exceptionResponse.message && Array.isArray(exceptionResponse.message)) {
      response.status(status).json({
        success: false,
        status: 'fail',
        statusCode: status,
        message: 'Validation failed',
        data: {
          errors: exceptionResponse.message,
        },
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    // Not a validation error, pass through
    response.status(status).json({
      success: false,
      status: 'fail',
      statusCode: status,
      message: exceptionResponse.message || 'Bad request',
      timestamp,
      path: request.url,
    });
  }
}
