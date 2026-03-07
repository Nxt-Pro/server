import type { PostResponseDto } from './post-response.dto';

export class PaginatedPostsDto {
  data: PostResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
