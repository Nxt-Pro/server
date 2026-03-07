import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { UpdatePlayerProfileDto } from './dto';
import { ProfilesService } from './profiles.service';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Controller('player/profile')
export class PlayerProfileController {
  private readonly profilesService: ProfilesService;

  constructor(profilesService: ProfilesService) {
    this.profilesService = profilesService;
  }

  @Get(':id')
  getProfile(@Param('id') id: string) {
    return this.profilesService.getPlayerProfile(id);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePlayerProfileDto,
  ) {
    return this.profilesService.updatePlayerProfile(user.sub, dto);
  }
}
