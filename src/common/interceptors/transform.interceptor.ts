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
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const statusCode: number = response.statusCode;

    function hasDataProp(obj: unknown): obj is { data: T; message?: string } {
      return typeof obj === 'object' && obj !== null && 'data' in obj;
    }

    return next.handle().pipe(
      map((data: T | { data: T; message?: string }) => ({
        success: true,
        status: 'success',
        statusCode,
        message: hasDataProp(data) ? data.message : undefined,
        data: hasDataProp(data) ? data.data : data,
        timestamp: new Date().toISOString(),
        path: request.url,
      })),
    );
  }
}
