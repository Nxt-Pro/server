import type { CommentResponseDto } from './comment-response.dto';

export class PaginatedCommentsDto {
  data: CommentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
