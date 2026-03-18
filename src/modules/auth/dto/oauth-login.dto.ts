import { IsOptional, IsString } from 'class-validator';

export class OAuthLoginDto {
  @IsString()
  provider: string;

  @IsOptional()
  @IsString()
  providerUserId: string;

  @IsOptional()
  @IsString()
  idToken?: string;

  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
