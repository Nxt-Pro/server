/** Lightweight user card for feeds - snake_case */
/** Lightweight user card for feeds - snake_case */
export class UserSummaryDto {
  id: string;
  role: 'player' | 'scout' | 'admin';
  name: string;
  profile_picture_url: string | null;
  /** Player: club · position. Scout: organization */
  subtitle: string | null;
}
