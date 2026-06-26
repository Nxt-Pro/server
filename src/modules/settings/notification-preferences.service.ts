import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateNotificationPreferencesDto } from './dto';
import { User, UserNotificationPreference } from '@/database/entities';

export type NotificationPreferenceKey =
  | 'chatRequests'
  | 'chatMessages'
  | 'chatAccepted'
  | 'connections'
  | 'postEngagement'
  | 'eventUpdates'
  | 'verificationUpdates';

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  inAppNotifications: true,
  emailNotifications: true,
  chatRequests: true,
  chatMessages: true,
  chatAccepted: true,
  connections: true,
  postEngagement: true,
  eventUpdates: true,
  verificationUpdates: true,
};

export interface NotificationPreferencesResponse {
  inAppNotifications: boolean;
  emailNotifications: boolean;
  chatRequests: boolean;
  chatMessages: boolean;
  chatAccepted: boolean;
  connections: boolean;
  postEngagement: boolean;
  eventUpdates: boolean;
  verificationUpdates: boolean;
}

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(UserNotificationPreference)
    private readonly preferenceRepository: Repository<UserNotificationPreference>,
  ) {}

  async getForUser(userId: string): Promise<NotificationPreferencesResponse> {
    const preferences = await this.findOrCreate(userId);
    return this.toResponse(preferences);
  }

  async updateForUser(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponse> {
    const preferences = await this.findOrCreate(userId);

    Object.assign(preferences, {
      ...this.pickDefined(dto),
      user: { id: userId } as User,
    });

    const saved = await this.preferenceRepository.save(preferences);
    return this.toResponse(saved);
  }

  async allowsInAppNotification(
    userId: string,
    preference?: NotificationPreferenceKey,
  ): Promise<boolean> {
    const preferences = await this.getForUser(userId);

    if (!preferences.inAppNotifications) {
      return false;
    }

    return preference ? preferences[preference] : true;
  }

  async allowsEmailNotification(
    userId: string,
    preference?: NotificationPreferenceKey,
  ): Promise<boolean> {
    const preferences = await this.getForUser(userId);

    if (!preferences.emailNotifications) {
      return false;
    }

    return preference ? preferences[preference] : true;
  }

  private async findOrCreate(
    userId: string,
  ): Promise<UserNotificationPreference> {
    const existing = await this.preferenceRepository.findOne({
      where: { user: { id: userId } },
    });

    if (existing) {
      return existing;
    }

    return this.preferenceRepository.save(
      this.preferenceRepository.create({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        user: { id: userId } as User,
      }),
    );
  }

  private toResponse(
    preferences: UserNotificationPreference,
  ): NotificationPreferencesResponse {
    return {
      inAppNotifications:
        preferences.inAppNotifications ??
        DEFAULT_NOTIFICATION_PREFERENCES.inAppNotifications,
      emailNotifications:
        preferences.emailNotifications ??
        DEFAULT_NOTIFICATION_PREFERENCES.emailNotifications,
      chatRequests:
        preferences.chatRequests ??
        DEFAULT_NOTIFICATION_PREFERENCES.chatRequests,
      chatMessages:
        preferences.chatMessages ??
        DEFAULT_NOTIFICATION_PREFERENCES.chatMessages,
      chatAccepted:
        preferences.chatAccepted ??
        DEFAULT_NOTIFICATION_PREFERENCES.chatAccepted,
      connections:
        preferences.connections ?? DEFAULT_NOTIFICATION_PREFERENCES.connections,
      postEngagement:
        preferences.postEngagement ??
        DEFAULT_NOTIFICATION_PREFERENCES.postEngagement,
      eventUpdates:
        preferences.eventUpdates ??
        DEFAULT_NOTIFICATION_PREFERENCES.eventUpdates,
      verificationUpdates:
        preferences.verificationUpdates ??
        DEFAULT_NOTIFICATION_PREFERENCES.verificationUpdates,
    };
  }

  private pickDefined(dto: UpdateNotificationPreferencesDto) {
    return Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
  }
}
