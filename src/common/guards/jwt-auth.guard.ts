import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  private readonly reflector: Reflector;

  constructor(reflector: Reflector) {
    super();
    this.reflector = reflector;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      const request = context.switchToHttp().getRequest<{
        headers?: { authorization?: string };
      }>();
      const authorization = request.headers?.authorization;
      if (authorization?.toLowerCase().startsWith('bearer ')) {
        try {
          return (await super.canActivate(context)) as boolean;
        } catch {
          return true;
        }
      }
      return true;
    }
    return (await super.canActivate(context)) as boolean;
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Invalid or missing token');
    }
    return user;
  }
}
