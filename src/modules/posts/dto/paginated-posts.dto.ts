import type { PostResponseDto } from './post-response.dto';

export class FeedRecommendationMetadataDto {
  personalized: boolean;
  fallback: boolean;
  reason?: string;
  data_source?: string;
  live_context?: boolean;
  candidate_count?: number;
  returned_count?: number;
  model_version?: string;
}

export class PaginatedPostsDto {
  data: PostResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  recommendation?: FeedRecommendationMetadataDto;
}
