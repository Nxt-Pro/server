/** Matches VideoResponseDto shape for AI scoring clients */
/** Matches VideoResponseDto shape for AI scoring clients */
export class AiVideoResponseDto {
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
