import type { AttachmentResponseDto } from './attachment-response.dto';

export class PostResponseDto {
  id: string;
  userId: string;
  caption: string | null;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  sharesCount: number;
  visibility: 'public' | 'connections' | 'private';
  isHighlight: boolean;
  attachments?: AttachmentResponseDto[];
  createdAt: string;
  updatedAt: string;
}
