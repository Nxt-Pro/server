import { IsString, MinLength } from 'class-validator';

export class TwoFaVerifyDto {
  @IsString()
  @MinLength(1, { message: 'Two-factor token is required' })
  twoFactorToken: string;

  @IsString()
  @MinLength(1, { message: 'Verification code is required' })
  code: string;
}
