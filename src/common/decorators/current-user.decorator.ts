import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface UserPayload {
  id: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserPayload | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const request = ctx.switchToHttp().getRequest() as Record<string, unknown>;
    if (request?.user) {
      return request.user as UserPayload;
    }
    const headers = request?.headers as Record<string, unknown> | undefined;
    const userId = headers?.['x-user-id'];
    if (typeof userId === 'string' && userId.length > 0) {
      return { id: userId };
    }
    return undefined;
  },
);
