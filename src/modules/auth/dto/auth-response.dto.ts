export class AuthResponseDto {
  user: {
    id: string;
    email: string;
    username?: string | null;
    role: string;
    name: string;
    twoFactorEnabled?: boolean;
  };
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  twoFactorRequired?: boolean;
  twoFactorToken?: string;
}
