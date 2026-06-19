export class MeResponseDto {
  id: string;
  email: string;
  username?: string | null;
  role: string;
  name: string;
  status: string;
  twoFactorEnabled: boolean;
  lastActive?: string;
  createdAt: string;
}
