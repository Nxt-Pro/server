import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { FirebaseService } from '@/integrations/firebase/firebase.service';
import { MailService } from '@/integrations/mail/mail.service';
import {
  Notification,
  NotificationData,
  NotificationReferenceType,
  NotificationType,
  User,
} from '@/database/entities';
import {
  NotificationPreferenceKey,
  NotificationPreferencesService,
} from '@/modules/settings';
import { UpdateNotificationPreferencesDto } from '@/modules/settings/dto';

export interface NotificationEmailPayload {
  to: string;
  subject?: string;
  message?: string;
}

export interface CreateNotificationEvent {
  userId: string;
  actorId?: string;
  allowSelfNotification?: boolean;
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: string;
  referenceType?: NotificationReferenceType;
  data?: NotificationData;
  preference?: NotificationPreferenceKey;
  dedupeKey?: string;
  email?: NotificationEmailPayload;
}

export interface NotificationCreatedEvent {
  userId: string;
  notification: {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    referenceId: string | null;
    referenceType: NotificationReferenceType | null;
    data: NotificationData | null;
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
    private readonly mailService: MailService,
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
      if (
        payload.actorId &&
        payload.actorId === payload.userId &&
        !payload.allowSelfNotification
      ) {
        this.logger.debug(
          `Skipping self notification ${payload.type} for user ${payload.userId}`,
        );
        return;
      }

      this.logger.log(
        `Creating notification for user ${payload.userId}: ${payload.type}`,
      );

      const notificationData = this.buildNotificationData(payload);
      const dedupeKey = notificationData?.dedupeKey;
      const existing = dedupeKey
        ? await this.findDuplicateNotification(payload, String(dedupeKey))
        : null;

      if (existing) {
        this.logger.log(
          `Duplicate notification suppressed for user ${payload.userId}: ${payload.type}`,
        );
        return;
      }

      const inAppAllowed =
        await this.notificationPreferencesService.allowsInAppNotification(
          payload.userId,
          payload.preference,
        );

      if (inAppAllowed) {
        await this.createInAppNotification(payload, notificationData);
      } else {
        this.logger.log(
          `Notification preference suppressed ${payload.type} for user ${payload.userId}`,
        );
      }

      await this.sendNotificationEmail(payload);
    } catch (error) {
      this.logger.error('Failed to create notification', error);
    }
  };

  private async createInAppNotification(
    payload: CreateNotificationEvent,
    data: NotificationData | null,
  ) {
    const notification = this.notificationRepo.create({
      user: { id: payload.userId },
      title: payload.title,
      message: payload.message,
      type: payload.type,
      referenceId: payload.referenceId ?? null,
      referenceType: payload.referenceType ?? null,
      data,
    });

    const savedNotification = await this.notificationRepo.save(notification);

    this.eventEmitter.emit('notification.created', {
      userId: payload.userId,
      notification: this.serializeNotification(savedNotification),
    } satisfies NotificationCreatedEvent);

    await this.sendPushNotification(payload, savedNotification);
  }

  private serializeNotification(savedNotification: Notification) {
    return {
      id: savedNotification.id,
      title: savedNotification.title,
      message: savedNotification.message,
      type: savedNotification.type,
      referenceId: savedNotification.referenceId,
      referenceType: savedNotification.referenceType,
      data: savedNotification.data,
      readAt: savedNotification.readAt?.toISOString() ?? null,
      createdAt: savedNotification.createdAt.toISOString(),
      updatedAt: savedNotification.updatedAt.toISOString(),
    };
  }

  private async sendPushNotification(
    payload: CreateNotificationEvent,
    savedNotification: Notification,
  ) {
    const user = await this.userRepo.findOne({
      where: { id: payload.userId },
      select: ['id', 'fcmTokens'],
    });

    if (!user?.fcmTokens?.length) {
      return;
    }

    const result = await this.firebaseService.sendMulticastNotification(
      user.fcmTokens,
      payload.title,
      payload.message,
      this.buildPushData(savedNotification),
    );

    if (result?.invalidTokens?.length) {
      const invalidTokens = new Set(result.invalidTokens);
      user.fcmTokens = user.fcmTokens.filter(
        token => !invalidTokens.has(token),
      );
      await this.userRepo.save(user);
      this.logger.warn(
        `Removed ${invalidTokens.size} invalid Firebase token(s) for user ${payload.userId}`,
      );
    }
  }

  private async sendNotificationEmail(payload: CreateNotificationEvent) {
    if (!payload.email?.to) {
      return;
    }

    const allowed =
      await this.notificationPreferencesService.allowsEmailNotification(
        payload.userId,
        payload.preference,
      );

    if (!allowed) {
      this.logger.log(
        `Email notification preference suppressed ${payload.type} for user ${payload.userId}`,
      );
      return;
    }

    if (!this.mailService.isConfigured()) {
      this.logger.warn(
        `Mail is not configured; skipping notification email ${payload.type} for user ${payload.userId}`,
      );
      return;
    }

    try {
      await this.mailService.sendNotificationEmail({
        to: payload.email.to,
        subject: payload.email.subject ?? payload.title,
        message: payload.email.message ?? payload.message,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send notification email ${payload.type} for user ${payload.userId}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  private async findDuplicateNotification(
    payload: CreateNotificationEvent,
    dedupeKey: string,
  ) {
    const query = this.notificationRepo
      .createQueryBuilder('notification')
      .innerJoin('notification.user', 'user')
      .where('user.id = :userId', { userId: payload.userId })
      .andWhere('notification.type = :type', { type: payload.type })
      .andWhere("notification.data ->> 'dedupeKey' = :dedupeKey", {
        dedupeKey,
      });

    if (payload.referenceId) {
      query.andWhere('notification.reference_id = :referenceId', {
        referenceId: payload.referenceId,
      });
    } else {
      query.andWhere('notification.reference_id IS NULL');
    }

    return query.getOne();
  }

  private buildNotificationData(
    payload: CreateNotificationEvent,
  ): NotificationData | null {
    const data: NotificationData = {};

    for (const [key, value] of Object.entries(payload.data ?? {})) {
      if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        data[key] = value;
      }
    }

    if (payload.dedupeKey) {
      data.dedupeKey = payload.dedupeKey;
    }

    return Object.keys(data).length > 0 ? data : null;
  }

  private buildPushData(notification: Notification): Record<string, string> {
    const data: Record<string, string> = {
      type: notification.type,
      notificationId: notification.id,
    };

    if (notification.referenceId) {
      data.referenceId = notification.referenceId;
    }

    if (notification.referenceType) {
      data.referenceType = notification.referenceType;
    }

    for (const [key, value] of Object.entries(notification.data ?? {})) {
      if (value !== null) {
        data[key] = String(value);
      }
    }

    return data;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

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

  deleteNotification = async (notificationId: string, userId: string) => {
    return this.notificationRepo.delete({
      id: notificationId,
      user: { id: userId },
    });
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

  clearAll = async (userId: string) => {
    return this.notificationRepo.delete({ user: { id: userId } });
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
