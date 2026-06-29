export class CommentResponseDto {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatarUrl: string | null;
  content: string;
  parentCommentId?: string;
  isReported: boolean;
  createdAt: string;
  updatedAt: string;
}
