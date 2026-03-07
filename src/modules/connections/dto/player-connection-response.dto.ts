/** Player-player connection response - snake_case */
/** Player-player connection response - snake_case */
export class PlayerConnectionResponseDto {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  requested_at: string;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}
