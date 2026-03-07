import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { REGISTRABLE_ROLES, type RegistrableRole } from '@/common/constants';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsEnum(REGISTRABLE_ROLES as unknown as Record<string, string>, {
    message: 'Role must be player or scout',
  })
  role: RegistrableRole;

  @IsOptional()
  @IsString()
  @MinLength(1)
  fullName?: string;
}
