import { IsEnum, IsOptional } from 'class-validator';

export class RegisterEventDto {
  // Empty for basic registration
}

export class UpdateRegistrationDto {
  @IsEnum(['pending', 'approved', 'rejected'])
  @IsOptional()
  status?: 'pending' | 'approved' | 'rejected';
}
