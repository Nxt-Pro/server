import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { UpdateScoutProfileDto } from './dto';
import { ProfilesService } from './profiles.service';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { CurrentUser, Public } from '@/common/decorators';

@Controller('scout/profile')
export class ScoutProfileController {
  private readonly profilesService: ProfilesService;

  constructor(profilesService: ProfilesService) {
    this.profilesService = profilesService;
  }

  @Get(':id')
  @Public()
  getProfile(@Param('id') id: string) {
    return this.profilesService.getScoutProfile(id);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateScoutProfileDto,
  ) {
    return this.profilesService.updateScoutProfile(user.sub, dto);
  }
}
