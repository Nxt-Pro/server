import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import 'reflect-metadata';

import { AdminGuard } from '@/modules/admin/guards';

function contextWithUser(user?: {
  sub: string;
  role: string;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  it('allows authenticated admins', () => {
    expect(
      guard.canActivate(contextWithUser({ sub: 'admin_1', role: 'admin' })),
    ).toBe(true);
  });

  it('rejects missing users', () => {
    expect(() => guard.canActivate(contextWithUser())).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects non-admin users', () => {
    expect(() =>
      guard.canActivate(contextWithUser({ sub: 'player_1', role: 'player' })),
    ).toThrow(ForbiddenException);
  });
});
