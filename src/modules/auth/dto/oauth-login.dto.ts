import { IsOptional, IsString } from 'class-validator';

export class OAuthLoginDto {
  @IsString()
  provider: string;

  @IsString()
  providerUserId: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
