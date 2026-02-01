import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  NotificationRealtimePayload,
  NotificationsGateway,
} from '@/modules/notifications/notifications.gateway';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    gateway = new NotificationsGateway();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handleConnection joins user room when userId exists', async () => {
    const join = jest.fn().mockResolvedValue(undefined);

    const client = {
      id: 'socket_1',
      handshake: { query: { userId: 'user_1' } },
      join,
    } as unknown as Socket;

    await gateway.handleConnection(client);

    expect(join).toHaveBeenCalledWith('user_user_1');
  });

  it('handleConnection does not join when userId missing', async () => {
    const join = jest.fn();

    const client = {
      id: 'socket_1',
      handshake: { query: {} },
      join,
    } as unknown as Socket;

    await gateway.handleConnection(client);

    expect(join).not.toHaveBeenCalled();
  });

  it('sendNotificationToUser emits to user room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });

    gateway.server = { to } as unknown as Server;

    const payload: NotificationRealtimePayload = {
      id: 'n1',
      title: 'T',
      message: 'M',
      type: 'like',
      reference_id: 'r1',
      read_at: null,
      createdAt: new Date(),
    };

    gateway.sendNotificationToUser('user_1', payload);

    expect(to).toHaveBeenCalledWith('user_user_1');
    expect(emit).toHaveBeenCalledWith('new_notification', payload);
  });
});
