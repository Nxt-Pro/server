import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(['text', 'image', 'file', 'video'])
  @IsOptional()
  messageType?: 'text' | 'image' | 'file' | 'video';

  @IsString()
  @IsOptional()
  attachmentUrl?: string;
}
