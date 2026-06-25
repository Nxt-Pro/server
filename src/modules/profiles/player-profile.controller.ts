import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateAchievementDto,
  CreateCareerTimelineDto,
  UpdateAchievementDto,
  UpdateCareerTimelineDto,
  UpdatePlayerProfileDto,
  UpdatePlayerSkillScoreDto,
} from './dto';
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

  @Post('timeline')
  createTimelineItem(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCareerTimelineDto,
  ) {
    return this.profilesService.createCareerTimelineItem(user.sub, dto);
  }

  @Patch('timeline/:timelineId')
  updateTimelineItem(
    @CurrentUser() user: JwtPayload,
    @Param('timelineId') timelineId: string,
    @Body() dto: UpdateCareerTimelineDto,
  ) {
    return this.profilesService.updateCareerTimelineItem(
      user.sub,
      timelineId,
      dto,
    );
  }

  @Delete('timeline/:timelineId')
  deleteTimelineItem(
    @CurrentUser() user: JwtPayload,
    @Param('timelineId') timelineId: string,
  ) {
    return this.profilesService.deleteCareerTimelineItem(user.sub, timelineId);
  }

  @Post('achievements')
  createAchievement(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAchievementDto,
  ) {
    return this.profilesService.createAchievement(user.sub, dto);
  }

  @Patch('achievements/:achievementId')
  updateAchievement(
    @CurrentUser() user: JwtPayload,
    @Param('achievementId') achievementId: string,
    @Body() dto: UpdateAchievementDto,
  ) {
    return this.profilesService.updateAchievement(user.sub, achievementId, dto);
  }

  @Delete('achievements/:achievementId')
  deleteAchievement(
    @CurrentUser() user: JwtPayload,
    @Param('achievementId') achievementId: string,
  ) {
    return this.profilesService.deleteAchievement(user.sub, achievementId);
  }
}
