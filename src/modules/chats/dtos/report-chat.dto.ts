import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportChatDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
