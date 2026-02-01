import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { FirebaseService } from '@/modules/firebase/firebase.service';
import { Notification, User } from '@/database/entities';

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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly firebaseService: FirebaseService,
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

      // 2. Send Real-Time Update (Via Firebase)
      const user = await this.userRepo.findOne({
        where: { id: payload.userId },
        select: ['fcmTokens'],
      });

      if (user && user.fcmTokens && user.fcmTokens.length > 0) {
        await this.firebaseService.sendMulticastNotification(
          user.fcmTokens,
          payload.title,
          payload.message,
          {
            type: payload.type,
            referenceId: payload.referenceId || '',
            notificationId: savedNotification.id,
          },
        );
      }
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

  async registerDeviceToken(userId: string, token: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'fcmTokens'],
    });

    if (!user) return;

    // Use Set to ensure uniqueness
    const tokens = new Set(user.fcmTokens || []);
    tokens.add(token);

    user.fcmTokens = Array.from(tokens);
    await this.userRepo.save(user);
  }

  async removeDeviceToken(userId: string, token: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'fcmTokens'],
    });

    if (!user || !user.fcmTokens) return;

    user.fcmTokens = user.fcmTokens.filter(t => t !== token);
    await this.userRepo.save(user);
  }
}
