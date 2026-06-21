import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  status: 'success';
  statusCode: number;
  message?: string;
  data: T;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const statusCode: number = response.statusCode;

    function isSimpleDataEnvelope(
      obj: unknown,
    ): obj is { data: T; message?: string } {
      if (typeof obj !== 'object' || obj === null || !('data' in obj)) {
        return false;
      }

      const keys = Object.keys(obj);
      return keys.every(key => key === 'data' || key === 'message');
    }

    return next.handle().pipe(
      map((data: T | { data: T; message?: string }) => ({
        success: true,
        status: 'success',
        statusCode,
        message: isSimpleDataEnvelope(data) ? data.message : undefined,
        data: isSimpleDataEnvelope(data) ? data.data : data,
        timestamp: new Date().toISOString(),
        path: request.url,
      })),
    );
  }
}
