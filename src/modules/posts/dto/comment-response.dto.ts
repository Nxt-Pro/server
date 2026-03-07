export class CommentResponseDto {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentCommentId?: string;
  isReported: boolean;
  createdAt: string;
  updatedAt: string;
}
