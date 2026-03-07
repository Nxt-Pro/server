import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpdatePlayerProfileDto } from './dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

@Controller('player/profile')
export class PlayerProfileController {
  constructor(private readonly profilesService: ProfilesService) {}

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
