import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { BlockUserDto, MuteUserDto } from './dto';
import { ProfilesService } from './profiles.service';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

@Controller('user')
export class UserController {
  private readonly profilesService: ProfilesService;

  constructor(profilesService: ProfilesService) {
    this.profilesService = profilesService;
  }

  @Get(':id/summary')
  getSummary(@Param('id') id: string) {
    return this.profilesService.getUserSummary(id);
  }

  @Post('block')
  blockUser(@CurrentUser() user: JwtPayload, @Body() dto: BlockUserDto) {
    return this.profilesService.blockUser(user.sub, dto.userId);
  }

  @Delete('block/:userId')
  unblockUser(
    @CurrentUser() user: JwtPayload,
    @Param('userId') userId: string,
  ) {
    return this.profilesService.unblockUser(user.sub, userId);
  }

  @Post('mute')
  muteUser(@CurrentUser() user: JwtPayload, @Body() dto: MuteUserDto) {
    return this.profilesService.muteUser(user.sub, dto.userId);
  }

  @Delete('mute/:userId')
  unmuteUser(@CurrentUser() user: JwtPayload, @Param('userId') userId: string) {
    return this.profilesService.unmuteUser(user.sub, userId);
  }
}
