import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { BlockUserDto, MuteUserDto } from './dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

@Controller('user')
export class UserController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get(':id/summary')
  getSummary(@Param('id') id: string) {
    return this.profilesService.getUserSummary(id);
  }

  @Post('block')
  blockUser(@CurrentUser() user: JwtPayload, @Body() dto: BlockUserDto) {
    return this.profilesService.blockUser(user.sub, dto.userId);
  }

  @Post('mute')
  muteUser(@CurrentUser() user: JwtPayload, @Body() dto: MuteUserDto) {
    return this.profilesService.muteUser(user.sub, dto.userId);
  }
}
