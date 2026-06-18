export class MeResponseDto {
  id: string;
  email: string;
  username?: string | null;
  role: string;
  name: string;
  status: string;
  lastActive?: string;
  createdAt: string;
}
