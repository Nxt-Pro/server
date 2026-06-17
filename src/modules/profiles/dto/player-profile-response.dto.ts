export class PlayerStatsResponseDto {
  id: string;
  player_id: string;
  season_year: number;
  goals: number;
  assists: number;
  matches_played: number;
  yellow_cards: number;
  red_cards: number;
  clean_sheets: number;
  avg_rating: number | null;
  created_at: string;
  updated_at: string;
}

export class CareerTimelineResponseDto {
  id: string;
  player_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  evidence_url: string | null;
  created_at: string;
  updated_at: string;
}

export class AchievementResponseDto {
  id: string;
  player_id: string;
  title: string;
  description: string;
  year: number;
  competition_level: 'local' | 'regional' | 'national' | 'international';
  verified: boolean;
  evidence_url: string | null;
  created_at: string;
  updated_at: string;
}

export class PlayerProfileResponseDto {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string;
  position: string | null;
  secondary_positions: string[];
  height_cm: number | null;
  weight_kg: number | null;
  nationality: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  profile_picture_url: string | null;
  cover_image_url: string | null;
  is_verified: boolean;
  basic_verified_at: string | null;
  club_verified_at: string | null;
  performance_verified_at: string | null;
  availability_status: 'available' | 'trialing' | 'contracted' | null;
  club_name: string | null;
  preferred_foot: 'left' | 'right' | 'both' | null;
  ai_score: number;
  skill_scores: Record<string, number>;
  total_posts: number;
  total_likes: number;
  total_views: number;
  is_featured: boolean;
  featured_until: string | null;
  profile_completeness: number;
  stats: PlayerStatsResponseDto[];
  career_timeline: CareerTimelineResponseDto[];
  achievements: AchievementResponseDto[];
  created_at: string;
  updated_at: string;
}
