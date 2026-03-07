export class AttachmentResponseDto {
  id: string;
  postId: string;
  contentType: 'image' | 'video';
  url: string;
  position: number;
  videoDuration?: number;
  videoThumbnailUrl?: string | null;
}
