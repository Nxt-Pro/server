import { Body, Controller, Post } from '@nestjs/common';
import { UploadImageDto } from './dto';
import { ProfilesService } from './profiles.service';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('profile')
export class ProfileUploadController {
  private readonly profilesService: ProfilesService;

  constructor(profilesService: ProfilesService) {
    this.profilesService = profilesService;
  }

  @Post('upload-avatar')
  uploadAvatar(@CurrentUser() user: JwtPayload, @Body() dto: UploadImageDto) {
    return this.profilesService.uploadAvatar(user.sub, dto.url);
  }

  @Post('upload-cover')
  uploadCover(@CurrentUser() user: JwtPayload, @Body() dto: UploadImageDto) {
    return this.profilesService.uploadCover(user.sub, dto.url);
  }
}
