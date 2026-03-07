import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

export const CurrentUser = createParamDecorator(
  (
    data: keyof JwtPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload | string | undefined => {
    const request = ctx.switchToHttp().getRequest<{
      user?: JwtPayload;
      headers?: Record<string, unknown>;
    }>();

    const user = request.user;

    if (data && user) {
      return user[data];
    }

    if (user) {
      return user;
    }

    const userId = request.headers?.['x-user-id'];

    if (typeof userId === 'string' && userId.length > 0) {
      return userId;
    }

    return undefined;
  },
);