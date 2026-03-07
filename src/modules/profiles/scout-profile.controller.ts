import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { UpdateScoutProfileDto } from './dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

@Controller('scout/profile')
export class ScoutProfileController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':id')
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
