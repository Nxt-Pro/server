import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { FirebaseService } from '@/integrations/firebase/firebase.service';
import { Notification, User } from '@/database/entities';
import {
  NotificationPreferenceKey,
  NotificationPreferencesService,
} from '@/modules/settings';
import { UpdateNotificationPreferencesDto } from '@/modules/settings/dto';

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
  preference?: NotificationPreferenceKey;
}

export interface NotificationCreatedEvent {
  userId: string;
  notification: {
    id: string;
    title: string;
    message: string;
    type: CreateNotificationEvent['type'];
    referenceId: string | null;
    readAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
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
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationPreferencesService: NotificationPreferencesService,
  ) {}

  /**
   * Listens to internal events and creates a notification.
   * Usage: this.eventEmitter.emit('notification.create', { ... })
   */
  private processNotificationCreate = async (
    payload: CreateNotificationEvent,
  ) => {
    try {
      this.logger.log(
        `Creating notification for user ${payload.userId}: ${payload.type}`,
      );

      const allowed =
        await this.notificationPreferencesService.allowsInAppNotification(
          payload.userId,
          payload.preference,
        );

      if (!allowed) {
        this.logger.log(
          `Notification preference suppressed ${payload.type} for user ${payload.userId}`,
        );
        return;
      }

      // 1. Save to Database
      const notification = this.notificationRepo.create({
        user: { id: payload.userId },
        title: payload.title,
        message: payload.message,
        type: payload.type,
        referenceId: payload.referenceId,
      });

      const savedNotification = await this.notificationRepo.save(notification);

      this.eventEmitter.emit('notification.created', {
        userId: payload.userId,
        notification: {
          id: savedNotification.id,
          title: savedNotification.title,
          message: savedNotification.message,
          type: savedNotification.type,
          referenceId: savedNotification.referenceId,
          readAt: savedNotification.readAt?.toISOString() ?? null,
          createdAt: savedNotification.createdAt.toISOString(),
          updatedAt: savedNotification.updatedAt.toISOString(),
        },
      } satisfies NotificationCreatedEvent);

      // 2. Send Push Update (Via Firebase)
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
  };

  @OnEvent('notification.create')
  onNotificationCreate(payload: CreateNotificationEvent) {
    return this.processNotificationCreate(payload);
  }

  handleNotificationCreate = async (payload: CreateNotificationEvent) => {
    return this.processNotificationCreate(payload);
  };

  getUserNotifications = async (
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ) => {
    return this.notificationRepo.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  };

  markAsRead = async (notificationId: string, userId: string) => {
    return this.notificationRepo.update(
      { id: notificationId, user: { id: userId } },
      { readAt: new Date() },
    );
  };

  getUnreadCount = async (userId: string) => {
    return this.notificationRepo.count({
      where: { user: { id: userId }, readAt: IsNull() },
    });
  };

  getPreferences = async (userId: string) => {
    return this.notificationPreferencesService.getForUser(userId);
  };

  updatePreferences = async (
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ) => {
    return this.notificationPreferencesService.updateForUser(userId, dto);
  };

  markAllAsRead = async (userId: string) => {
    return this.notificationRepo.update(
      { user: { id: userId }, readAt: IsNull() },
      { readAt: new Date() },
    );
  };

  registerDeviceToken = async (userId: string, token: string) => {
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
  };

  removeDeviceToken = async (userId: string, token: string) => {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'fcmTokens'],
    });

    if (!user || !user.fcmTokens) return;

    user.fcmTokens = user.fcmTokens.filter(t => t !== token);
    await this.userRepo.save(user);
  };
}
