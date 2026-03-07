export class ConnectionResponseDto {
  id: string;
  player_id: string;
  scout_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  initiated_by: 'player' | 'scout';
  requested_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}
