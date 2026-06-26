import { Repository } from 'typeorm';

import {
  Event,
  EventRegistration,
  PlayerProfile,
  User,
} from '@/database/entities';
import { RegistrationsService } from '@/modules/events/submodules/registrations/registrations.service';

function createQueryBuilderMock() {
  const qb = {
    setLock: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    getOne: jest.fn().mockResolvedValue(null),
  };

  qb.setLock.mockReturnValue(qb);
  qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);

  return qb;
}

describe('RegistrationsService notifications', () => {
  let eventRepository: { findOne: jest.Mock };
  let registrationRepository: {
    manager: { transaction: jest.Mock };
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
  };
  let playerProfileRepository: { findOne: jest.Mock };
  let userRepository: { findOne: jest.Mock };
  let eventEmitter: { emit: jest.Mock };
  let mailService: {
    sendEventRegistrationSubmittedEmail: jest.Mock;
    sendEventRegistrationStatusEmail: jest.Mock;
  };
  let notificationPreferencesService: { allowsEmailNotification: jest.Mock };
  let service: RegistrationsService;

  const player = {
    id: 'player_1',
    email: 'player@nxtpro.dev',
    username: 'Player One',
    role: 'player',
  } as User;
  const admin = {
    id: 'admin_1',
    email: 'admin@nxtpro.dev',
    role: 'admin',
  } as User;
  const event = {
    id: 'event_1',
    title: 'Trial Day',
    status: 'approved',
    maxParticipants: 0,
    participantCount: 0,
    registrationDeadline: null,
    organizer: { id: 'organizer_1' } as User,
  } as Event;
  const registration = {
    id: 'registration_1',
    status: 'pending',
    event,
    player: { userId: player.id, user: player } as PlayerProfile,
    registeredAt: new Date('2026-06-25T10:00:00.000Z'),
  } as EventRegistration;

  beforeEach(() => {
    eventRepository = { findOne: jest.fn() };
    registrationRepository = {
      manager: { transaction: jest.fn() },
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
    };
    playerProfileRepository = { findOne: jest.fn() };
    userRepository = {
      findOne: jest.fn(({ where }: { where: { id: string } }) => {
        if (where.id === player.id) return Promise.resolve(player);
        if (where.id === admin.id) return Promise.resolve(admin);
        return Promise.resolve(null);
      }),
    };
    eventEmitter = { emit: jest.fn() };
    mailService = {
      sendEventRegistrationSubmittedEmail: jest
        .fn()
        .mockResolvedValue(undefined),
      sendEventRegistrationStatusEmail: jest.fn().mockResolvedValue(undefined),
    };
    notificationPreferencesService = {
      allowsEmailNotification: jest.fn().mockResolvedValue(true),
    };

    service = new RegistrationsService(
      eventRepository as unknown as Repository<Event>,
      registrationRepository as unknown as Repository<EventRegistration>,
      playerProfileRepository as unknown as Repository<PlayerProfile>,
      userRepository as unknown as Repository<User>,
      eventEmitter as never,
      mailService as never,
      notificationPreferencesService as never,
    );
  });

  it('notifies the organizer and confirms by email when a player registers', async () => {
    const qb = createQueryBuilderMock();
    const manager = {
      findOne: jest.fn().mockResolvedValue(event),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      create: jest.fn().mockReturnValue(registration),
      save: jest.fn((value: Event | EventRegistration) =>
        Promise.resolve(value),
      ),
    };

    playerProfileRepository.findOne.mockResolvedValue({ userId: player.id });
    registrationRepository.manager.transaction.mockImplementation(
      (work: (value: typeof manager) => Promise<unknown>) => work(manager),
    );
    registrationRepository.findOne.mockResolvedValue(registration);

    await service.registerForEvent(event.id, player.id);

    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.create', {
      userId: 'organizer_1',
      title: 'New event registration',
      message: 'Player One registered for "Trial Day".',
      type: 'new_event',
      referenceId: event.id,
      preference: 'eventUpdates',
    });
    expect(
      notificationPreferencesService.allowsEmailNotification,
    ).toHaveBeenCalledWith(player.id, 'eventUpdates');
    expect(
      mailService.sendEventRegistrationSubmittedEmail,
    ).toHaveBeenCalledWith(player.email, event.title);
  });

  it('notifies and emails the player when registration status changes', async () => {
    const approved = {
      ...registration,
      status: 'approved',
    } as EventRegistration;

    registrationRepository.findOne.mockResolvedValue(registration);
    registrationRepository.save.mockResolvedValue(approved);

    await service.updateRegistration(registration.id, admin.id, {
      status: 'approved',
    });

    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.create', {
      userId: player.id,
      title: 'Registration status updated',
      message: 'Your registration for "Trial Day" is now approved.',
      type: 'new_event',
      referenceId: event.id,
      preference: 'eventUpdates',
    });
    expect(mailService.sendEventRegistrationStatusEmail).toHaveBeenCalledWith(
      player.email,
      event.title,
      'approved',
    );
  });

  it('suppresses registration emails when event emails are disabled', async () => {
    const rejected = {
      ...registration,
      status: 'rejected',
    } as EventRegistration;

    notificationPreferencesService.allowsEmailNotification.mockResolvedValue(
      false,
    );
    registrationRepository.findOne.mockResolvedValue(registration);
    registrationRepository.save.mockResolvedValue(rejected);

    await service.updateRegistration(registration.id, admin.id, {
      status: 'rejected',
    });

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'notification.create',
      expect.objectContaining({
        userId: player.id,
        preference: 'eventUpdates',
      }),
    );
    expect(mailService.sendEventRegistrationStatusEmail).not.toHaveBeenCalled();
  });

  it('notifies the organizer when a player cancels a registration', async () => {
    const activeRegistration = {
      ...registration,
      cancelled: false,
      event: {
        ...event,
        organizer: { id: 'organizer_1' } as User,
        participantCount: 1,
      } as Event,
    } as EventRegistration;
    const manager = {
      findOne: jest.fn().mockResolvedValue(activeRegistration),
      save: jest.fn((value: Event | EventRegistration) =>
        Promise.resolve(value),
      ),
    };

    registrationRepository.manager.transaction.mockImplementation(
      (work: (value: typeof manager) => Promise<unknown>) => work(manager),
    );

    await service.cancelRegistration(registration.id, player.id);

    expect(eventEmitter.emit).toHaveBeenCalledWith('notification.create', {
      userId: 'organizer_1',
      title: 'Registration cancelled',
      message: 'Player One cancelled their registration for "Trial Day".',
      type: 'new_event',
      referenceId: event.id,
      preference: 'eventUpdates',
    });
  });
});
