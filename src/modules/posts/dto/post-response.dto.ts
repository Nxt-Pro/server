import type { AttachmentResponseDto } from './attachment-response.dto';

export class PostAuthorResponseDto {
  id: string;
  role: 'player' | 'scout' | 'admin';
  name: string;
  profilePictureUrl: string | null;
  profile_picture_url?: string | null;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  position?: string | null;
  isVerified?: boolean;
}

export class PostResponseDto {
  id: string;
  userId: string;
  author?: PostAuthorResponseDto | null;
  caption: string | null;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  visibility: 'public' | 'connections' | 'private';
  isHighlight: boolean;
  attachments?: AttachmentResponseDto[];
  createdAt: string;
  updatedAt: string;
}
