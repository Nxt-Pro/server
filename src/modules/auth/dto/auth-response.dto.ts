export class AuthResponseDto {
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
  token: string;
  refreshToken?: string;
  expiresIn?: number;
  twoFactorRequired?: boolean;
  twoFactorToken?: string;
}
