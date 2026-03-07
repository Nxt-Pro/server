import type { VideoResponseDto } from './video-response.dto';

export class PaginatedVideosDto {
  data: VideoResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
