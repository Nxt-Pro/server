import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';

import {
  Connection,
  PlayerConnection,
  PlayerProfile,
  ScoutProfile,
  User,
} from '@/database/entities';
import { ConnectionsService } from '@/modules/connections/connections.service';

function dated<T extends { id: string }>(entity: T) {
  return {
    createdAt: new Date('2026-06-25T10:00:00.000Z'),
    updatedAt: new Date('2026-06-25T10:00:00.000Z'),
    ...entity,
  };
}

describe('ConnectionsService notifications', () => {
  let connectionRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let playerConnectionRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let playerProfileRepository: { findOne: jest.Mock };
  let scoutProfileRepository: { findOne: jest.Mock };
  let userRepository: { findOne: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let mailService: {
    sendConnectionRequestEmail: jest.Mock;
    sendConnectionAcceptedEmail: jest.Mock;
  };
  let notificationPreferencesService: { allowsEmailNotification: jest.Mock };
  let service: ConnectionsService;

  const player = {
    id: 'player_1',
    email: 'player@nxtpro.dev',
    username: 'Player One',
    role: 'player',
  } as User;
  const scout = {
    id: 'scout_1',
    email: 'scout@nxtpro.dev',
    username: 'Scout One',
    role: 'scout',
  } as User;

  beforeEach(() => {
    connectionRepository = {
      findOne: jest.fn(),
      create: jest.fn((value: Partial<Connection>) =>
        dated({ id: 'connection_1', ...value }),
      ),
      save: jest.fn((value: Connection) => Promise.resolve(value)),
      find: jest.fn(),
    };
    playerConnectionRepository = {
      findOne: jest.fn(),
      create: jest.fn((value: Partial<PlayerConnection>) =>
        dated({ id: 'player_connection_1', ...value }),
      ),
      save: jest.fn((value: PlayerConnection) => Promise.resolve(value)),
      find: jest.fn(),
    };
    playerProfileRepository = { findOne: jest.fn() };
    scoutProfileRepository = { findOne: jest.fn() };
    userRepository = {
      findOne: jest.fn(({ where }: { where: { id: string } }) => {
        if (where.id === player.id) return Promise.resolve(player);
        if (where.id === scout.id) return Promise.resolve(scout);
        return Promise.resolve(null);
      }),
    };
    eventEmitter = { emit: jest.fn() };
    mailService = {
      sendConnectionRequestEmail: jest.fn().mockResolvedValue(undefined),
      sendConnectionAcceptedEmail: jest.fn().mockResolvedValue(undefined),
    };
    notificationPreferencesService = {
      allowsEmailNotification: jest.fn().mockResolvedValue(true),
    };

    service = new ConnectionsService(
      connectionRepository as unknown as Repository<Connection>,
      playerConnectionRepository as unknown as Repository<PlayerConnection>,
      playerProfileRepository as unknown as Repository<PlayerProfile>,
      scoutProfileRepository as unknown as Repository<ScoutProfile>,
      userRepository as unknown as Repository<User>,
      eventEmitter as never,
      mailService as never,
      notificationPreferencesService as never,
    );
  });

  it('notifies and emails the recipient for connection requests', async () => {
    playerProfileRepository.findOne.mockResolvedValue({ userId: player.id });
    scoutProfileRepository.findOne.mockResolvedValue({ userId: scout.id });
    connectionRepository.findOne.mockResolvedValue(null);

    await service.connectPlayerToScout(player.id, scout.id);

    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.create', {
      userId: scout.id,
      title: 'New connection request',
      message: 'Player One sent you a connection request.',
      type: 'connection_request',
      referenceId: player.id,
      preference: 'connections',
    });
    expect(mailService.sendConnectionRequestEmail).toHaveBeenCalledWith(
      scout.email,
      'Player One',
    );
  });

  it('notifies and emails the requester when a connection is accepted', async () => {
    const connection = dated({
      id: 'connection_1',
      playerId: player.id,
      scoutId: scout.id,
      status: 'pending' as const,
      initiatedBy: 'player' as const,
      requestedAt: new Date('2026-06-25T10:00:00.000Z'),
    }) as Connection;

    connectionRepository.findOne.mockResolvedValue(connection);

    await service.respondToConnection(connection.id, scout.id, {
      status: 'accepted',
    });

    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.create', {
      userId: player.id,
      title: 'Connection accepted',
      message: 'Scout One accepted your connection request.',
      type: 'connection_request',
      referenceId: scout.id,
      preference: 'connections',
    });
    expect(mailService.sendConnectionAcceptedEmail).toHaveBeenCalledWith(
      player.email,
      'Scout One',
    );
  });

  it('does not email connection updates when connection emails are disabled', async () => {
    notificationPreferencesService.allowsEmailNotification.mockResolvedValue(
      false,
    );
    playerProfileRepository.findOne.mockResolvedValue({ userId: player.id });
    scoutProfileRepository.findOne.mockResolvedValue({ userId: scout.id });
    connectionRepository.findOne.mockResolvedValue(null);

    await service.connectPlayerToScout(player.id, scout.id);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'notification.create',
      expect.objectContaining({ preference: 'connections' }),
    );
    expect(mailService.sendConnectionRequestEmail).not.toHaveBeenCalled();
  });

  it('does not notify self connection attempts', async () => {
    playerProfileRepository.findOne
      .mockResolvedValueOnce({ userId: player.id })
      .mockResolvedValueOnce({ userId: player.id });

    await expect(
      service.connectPlayerToPlayer(player.id, player.id),
    ).rejects.toThrow(ConflictException);

    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(mailService.sendConnectionRequestEmail).not.toHaveBeenCalled();
  });
});
