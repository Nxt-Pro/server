import { IsString, MinLength } from 'class-validator';

export class TwoFaConfirmDto {
  @IsString()
  @MinLength(1, { message: 'Verification code is required' })
  code: string;
}
