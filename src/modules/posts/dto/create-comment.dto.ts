import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1, { message: 'Comment content is required' })
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsString()
  parentCommentId?: string;
}
