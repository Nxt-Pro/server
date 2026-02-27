import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Guard that restricts access to admin-only endpoints.
 * Expects `req.user` to be populated by an upstream auth guard (e.g. JwtAuthGuard).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  private readonly configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as unknown as { user?: { id: string; role: string } })
      .user;

    const isDev = this.configService.get<string>('nodeEnv') !== 'production';

    // TODO: remove dev-mode fallback once JwtAuthGuard is wired up to populate req.user
    if (!user && isDev) {
      this.logger.warn(
        'AdminGuard: No user on request — allowing in development mode',
      );
      return true;
    }

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
