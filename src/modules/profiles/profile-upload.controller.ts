import { Body, Controller, Post } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UploadImageDto } from './dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

@Controller('profile')
export class ProfileUploadController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post('upload-avatar')
  uploadAvatar(@CurrentUser() user: JwtPayload, @Body() dto: UploadImageDto) {
    return this.profilesService.uploadAvatar(user.sub, dto.url);
  }

  @Post('upload-cover')
  uploadCover(@CurrentUser() user: JwtPayload, @Body() dto: UploadImageDto) {
    return this.profilesService.uploadCover(user.sub, dto.url);
  }
}
