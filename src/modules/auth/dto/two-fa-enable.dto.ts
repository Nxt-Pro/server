import { IsBoolean } from 'class-validator';

export class TwoFaEnableDto {
  @IsBoolean()
  enabled: boolean;
}
