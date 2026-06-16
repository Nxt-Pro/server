import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { NotificationsService } from './notifications.service';
import { HttpError } from '@/common/utils';
import { CurrentUser } from '@/common/decorators';

class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

// import { JwtAuthGuard } from '@/modules/auth/guards'; // Check where guards are

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('device')
  async registerDevice(
    @CurrentUser('sub') userId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    if (!userId) throw HttpError.unauthorized();
    await this.notificationsService.registerDeviceToken(userId, dto.token);
    return { message: 'Device registered successfully' };
  }

  @Delete('device/:token')
  async removeDevice(
    @CurrentUser('sub') userId: string,
    @Param('token') token: string,
  ) {
    if (!userId) throw HttpError.unauthorized();
    await this.notificationsService.removeDeviceToken(userId, token);
    return { message: 'Device removed successfully' };
  }

  @Get()
  async getNotifications(
    @CurrentUser('sub') userId: string,
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ) {
    // Check if user exists (handled by Guard usually)
    if (!userId) throw HttpError.unauthorized();
    return this.notificationsService.getUserNotifications(
      userId,
      Number(limit),
      Number(offset),
    );
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser('sub') userId: string) {
    if (!userId) throw HttpError.unauthorized();
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    if (!userId) throw HttpError.unauthorized();
    return this.notificationsService.markAsRead(id, userId);
  }
}
