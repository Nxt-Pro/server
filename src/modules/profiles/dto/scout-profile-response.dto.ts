export class ScoutProfileResponseDto {
  user_id: string;
  full_name: string;
  organization: string;
  organization_type: 'club' | 'agency' | 'independent';
  license_number: string | null;
  years_experience: number | null;
  scouting_positions: string[];
  countries_covered: string[];
  bio: string | null;
  profile_picture_url: string | null;
  cover_image_url: string | null;
  total_notes: number;
  verification_status: 'pending' | 'verified' | 'rejected';
  profile_completeness: number;
  created_at: string;
  updated_at: string;
}
