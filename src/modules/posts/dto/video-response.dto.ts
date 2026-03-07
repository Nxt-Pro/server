/** Matches frontend Video type (snake_case) for compatibility */
/** Matches frontend Video type (snake_case) for compatibility */
export class VideoResponseDto {
  id: string;
  post_id: string;
  url: string;
  video_thumbnail_url: string | null;
  video_duration: number;
  title: string;
  views_count: number;
  caption?: string;
  visibility?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}
