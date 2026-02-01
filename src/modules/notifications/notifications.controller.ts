import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '@/common/decorators';
// import { JwtAuthGuard } from '@/modules/auth/guards'; // Check where your guards are

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: { id: string },
    @Query('limit') limit = 20,
    @Query('offset') offset = 0,
  ) {
    // Check if user exists (handled by Guard usually)
    if (!user) return [];
    return this.notificationsService.getUserNotifications(
      user.id,
      Number(limit),
      Number(offset),
    );
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: { id: string }) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(id, user.id);
  }
}
