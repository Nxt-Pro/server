import { Test } from '@nestjs/testing';
import { NotificationsController } from '@/modules/notifications/notifications.controller';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import 'reflect-metadata';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: {
    getUserNotifications: jest.Mock;
    markAllAsRead: jest.Mock;
    markAsRead: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getUserNotifications: jest.fn(),
      markAllAsRead: jest.fn(),
      markAsRead: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = moduleRef.get(NotificationsController);
  });

  it('getNotifications throws if user missing', async () => {
    await expect(
      controller.getNotifications(
        undefined as unknown as { id: string },
        20,
        0,
      ),
    ).rejects.toBeDefined();
    expect(service.getUserNotifications).not.toHaveBeenCalled();
  });

  it('getNotifications calls service with numeric limit/offset', async () => {
    service.getUserNotifications.mockResolvedValue([{ id: 'n1' }]);

    const res = await controller.getNotifications({ id: 'user_1' }, 10, 5);

    expect(service.getUserNotifications).toHaveBeenCalledWith('user_1', 10, 5);
    expect(res).toEqual([{ id: 'n1' }]);
  });

  it('markAllAsRead calls service', async () => {
    service.markAllAsRead.mockResolvedValue({ affected: 2 });

    const res = await controller.markAllAsRead({ id: 'user_1' });

    expect(service.markAllAsRead).toHaveBeenCalledWith('user_1');
    expect(res).toEqual({ affected: 2 });
  });

  it('markAsRead calls service', async () => {
    service.markAsRead.mockResolvedValue({ affected: 1 });

    const res = await controller.markAsRead({ id: 'user_1' }, 'notif_1');

    expect(service.markAsRead).toHaveBeenCalledWith('notif_1', 'user_1');
    expect(res).toEqual({ affected: 1 });
  });
});
