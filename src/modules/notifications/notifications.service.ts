import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { NotificationsGateway } from './notifications.gateway';
import { Notification } from '@/database/entities';

export interface CreateNotificationEvent {
  userId: string;
  title: string;
  message: string;
  type:
    | 'like'
    | 'comment'
    | 'message'
    | 'connection_request'
    | 'verification'
    | 'marketing'
    | 'new_event';
  referenceId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  /**
   * Listens to internal events and creates a notification.
   * Usage: this.eventEmitter.emit('notification.create', { ... })
   */
  @OnEvent('notification.create')
  async handleNotificationCreate(payload: CreateNotificationEvent) {
    try {
      this.logger.log(
        `Creating notification for user ${payload.userId}: ${payload.type}`,
      );

      // 1. Save to Database
      const notification = this.notificationRepo.create({
        user: { id: payload.userId }, // Assuming user exists
        title: payload.title,
        message: payload.message,
        type: payload.type,
        reference_id: payload.referenceId,
      });

      const savedNotification = await this.notificationRepo.save(notification);

      // 2. Send Real-Time Update
      this.notificationsGateway.sendNotificationToUser(
        payload.userId,
        savedNotification,
      );
    } catch (error) {
      this.logger.error('Failed to create notification', error);
    }
  }

  async getUserNotifications(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ) {
    return this.notificationRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.notificationRepo.update(
      { id: notificationId, user: { id: userId } },
      { read_at: new Date() },
    );
  }

  async markAllAsRead(userId: string) {
    return this.notificationRepo.update(
      { user: { id: userId }, read_at: IsNull() },
      { read_at: new Date() },
    );
  }
}
