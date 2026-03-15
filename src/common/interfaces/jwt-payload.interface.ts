import type { UserRole } from '../constants/roles.constant';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  type: 'access' | 'refresh' | '2fa';
  iat?: number;
  exp?: number;
}
