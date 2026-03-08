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
    @CurrentUser() user: { id: string },
    @Body() dto: RegisterDeviceDto,
  ) {
    if (!user) throw HttpError.unauthorized();
    await this.notificationsService.registerDeviceToken(user.id, dto.token);
    return { message: 'Device registered successfully' };
  }

  @Delete('device/:token')
  async removeDevice(
    @CurrentUser() user: { id: string },
    @Param('token') token: string,
  ) {
    if (!user) throw HttpError.unauthorized();
    await this.notificationsService.removeDeviceToken(user.id, token);
    return { message: 'Device removed successfully' };
  }

  @Get()
  async getNotifications(
    @CurrentUser() user: { id: string },
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ) {
    // Check if user exists (handled by Guard usually)
    if (!user) throw HttpError.unauthorized();
    return this.notificationsService.getUserNotifications(
      user.id,
      Number(limit),
      Number(offset),
    );
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: { id: string }) {
    if (!user) throw HttpError.unauthorized();
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    if (!user) throw HttpError.unauthorized();
    return this.notificationsService.markAsRead(id, user.id);
  }
}
