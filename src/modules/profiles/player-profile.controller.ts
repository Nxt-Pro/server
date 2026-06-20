import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { UpdatePlayerProfileDto, UpdatePlayerSkillScoreDto } from './dto';
import { ProfilesService } from './profiles.service';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { CurrentUser, Public } from '@/common/decorators';

@Controller('player/profile')
export class PlayerProfileController {
  private readonly profilesService: ProfilesService;

  constructor(profilesService: ProfilesService) {
    this.profilesService = profilesService;
  }

  @Get(':id')
  @Public()
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

  @Patch('skills')
  updateSkillScore(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdatePlayerSkillScoreDto,
  ) {
    return this.profilesService.updatePlayerSkillScore(user.sub, dto);
  }
}
