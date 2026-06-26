import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import 'reflect-metadata';
import { FindOperator } from 'typeorm';
import { Notification, User } from '@/database/entities';
import { FirebaseService } from '@/integrations/firebase/firebase.service';
import { NotificationPreferencesService } from '@/modules/settings';
import {
  CreateNotificationEvent,
  NotificationsService,
} from '@/modules/notifications/notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  let userRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let firebaseService: { sendMulticastNotification: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let notificationPreferencesService: {
    allowsInAppNotification: jest.Mock;
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    notificationRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    firebaseService = {
      sendMulticastNotification: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };
    notificationPreferencesService = {
      allowsInAppNotification: jest.fn().mockResolvedValue(true),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: notificationRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: FirebaseService,
          useValue: firebaseService,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
        {
          provide: NotificationPreferencesService,
          useValue: notificationPreferencesService,
        },
      ],
    }).compile();

    service = moduleRef.get(NotificationsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handleNotificationCreate saves to DB then emits realtime', async () => {
    const payload: CreateNotificationEvent = {
      userId: 'user_1',
      title: 'New Like',
      message: 'Someone liked your post',
      type: 'like',
      referenceId: 'post_1',
    };

    const created = { created: true };
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:01:00.000Z');
    const saved = {
      id: 'notif_1',
      title: payload.title,
      message: payload.message,
      type: payload.type,
      referenceId: payload.referenceId,
      readAt: null,
      createdAt,
      updatedAt,
    };
    const user = { id: 'user_1', fcmTokens: ['token_1'] };

    notificationRepo.create.mockReturnValue(created);
    notificationRepo.save.mockResolvedValue(saved);
    userRepo.findOne.mockResolvedValue(user);

    await service.handleNotificationCreate(payload);

    expect(notificationRepo.create).toHaveBeenCalledWith({
      user: { id: payload.userId },
      title: payload.title,
      message: payload.message,
      type: payload.type,
      referenceId: payload.referenceId,
    });
    expect(
      notificationPreferencesService.allowsInAppNotification,
    ).toHaveBeenCalledWith(payload.userId, undefined);

    expect(notificationRepo.save).toHaveBeenCalledWith(created);
    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.created', {
      userId: payload.userId,
      notification: {
        id: saved.id,
        title: saved.title,
        message: saved.message,
        type: saved.type,
        referenceId: saved.referenceId,
        readAt: null,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
    });
    expect(userRepo.findOne).toHaveBeenCalledWith({
      where: { id: payload.userId },
      select: ['fcmTokens'],
    });
    expect(firebaseService.sendMulticastNotification).toHaveBeenCalledWith(
      ['token_1'],
      payload.title,
      payload.message,
      expect.objectContaining({
        type: payload.type,
        notificationId: saved.id,
      }),
    );
  });

  it('getUserNotifications queries by userId with pagination and order', async () => {
    const expected = [{ id: 'n1' }];
    notificationRepo.find.mockResolvedValue(expected);

    const res = await service.getUserNotifications('user_1', 10, 5);

    expect(notificationRepo.find).toHaveBeenCalledWith({
      where: { user: { id: 'user_1' } },
      order: { createdAt: 'DESC' },
      take: 10,
      skip: 5,
    });
    expect(res).toBe(expected);
  });

  it('markAsRead updates read_at for that notification + user', async () => {
    notificationRepo.update.mockResolvedValue({ affected: 1 });

    await expect(service.markAsRead('notif_1', 'user_1')).resolves.toEqual({
      affected: 1,
    });

    const [whereArg, updateArg] = (notificationRepo.update.mock.calls[0] ??
      []) as unknown as [
      { id: string; user: { id: string } },
      { readAt: unknown },
    ];

    expect(whereArg).toEqual({ id: 'notif_1', user: { id: 'user_1' } });
    expect(updateArg.readAt).toBeInstanceOf(Date);
  });

  it('deleteNotification deletes that notification for that user', async () => {
    notificationRepo.delete.mockResolvedValue({ affected: 1 });

    await expect(
      service.deleteNotification('notif_1', 'user_1'),
    ).resolves.toEqual({
      affected: 1,
    });

    expect(notificationRepo.delete).toHaveBeenCalledWith({
      id: 'notif_1',
      user: { id: 'user_1' },
    });
  });

  it('markAllAsRead only updates unread notifications (IsNull)', async () => {
    notificationRepo.update.mockResolvedValue({ affected: 3 });

    await expect(service.markAllAsRead('user_1')).resolves.toEqual({
      affected: 3,
    });

    const [whereArg, updateArg] = (notificationRepo.update.mock.calls[0] ??
      []) as unknown as [
      { user: { id: string }; readAt: FindOperator<unknown> },
      { readAt: Date },
    ];

    expect(whereArg).toMatchObject({ user: { id: 'user_1' } });
    expect(whereArg.readAt).toBeInstanceOf(FindOperator);
    expect(whereArg.readAt.type).toBe('isNull');

    expect(updateArg.readAt).toBeInstanceOf(Date);
  });

  it('clearAll deletes all notifications for the user', async () => {
    notificationRepo.delete.mockResolvedValue({ affected: 5 });

    await expect(service.clearAll('user_1')).resolves.toEqual({
      affected: 5,
    });

    expect(notificationRepo.delete).toHaveBeenCalledWith({
      user: { id: 'user_1' },
    });
  });

  it('getUnreadCount counts unread notifications for a user', async () => {
    notificationRepo.count.mockResolvedValue(4);

    await expect(service.getUnreadCount('user_1')).resolves.toBe(4);

    const [countArg] = (notificationRepo.count.mock.calls[0] ??
      []) as unknown as [
      { where: { user: { id: string }; readAt: FindOperator<unknown> } },
    ];

    expect(countArg.where.user).toEqual({ id: 'user_1' });
    expect(countArg.where.readAt).toBeInstanceOf(FindOperator);
    expect(countArg.where.readAt.type).toBe('isNull');
  });

  it('handleNotificationCreate swallows errors (logs) and does not throw', async () => {
    const payload: CreateNotificationEvent = {
      userId: 'user_1',
      title: 't',
      message: 'm',
      type: 'like',
    };

    notificationRepo.create.mockReturnValue({});
    notificationRepo.save.mockRejectedValue(new Error('db fail'));

    await expect(
      service.handleNotificationCreate(payload),
    ).resolves.toBeUndefined();
    expect(firebaseService.sendMulticastNotification).not.toHaveBeenCalled();
  });

  it('handleNotificationCreate skips DB and push when preferences suppress it', async () => {
    const payload: CreateNotificationEvent = {
      userId: 'user_1',
      title: 'New message',
      message: 'A message arrived',
      type: 'message',
      preference: 'chatMessages',
    };

    notificationPreferencesService.allowsInAppNotification.mockResolvedValue(
      false,
    );

    await service.handleNotificationCreate(payload);

    expect(
      notificationPreferencesService.allowsInAppNotification,
    ).toHaveBeenCalledWith('user_1', 'chatMessages');
    expect(notificationRepo.create).not.toHaveBeenCalled();
    expect(notificationRepo.save).not.toHaveBeenCalled();
    expect(firebaseService.sendMulticastNotification).not.toHaveBeenCalled();
  });
});
