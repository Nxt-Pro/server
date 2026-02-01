import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EventsService } from '../../../src/modules/events/events.service';
import { createQueryBuilderMock } from '../../helpers/mock.helpers';
import { Event, EventRegistration, PlayerProfile } from '@/database/entities';

describe('EventsService', () => {
  let service: EventsService;
  let eventRepository: Repository<Event>;
  let registrationRepository: Repository<EventRegistration>;
  let eventRepoMock: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
    remove: jest.Mock;
    increment: jest.Mock;
  };
  let registrationRepoMock: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(() => {
    eventRepoMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      remove: jest.fn(),
      increment: jest.fn(),
    };
    eventRepository = eventRepoMock as unknown as Repository<Event>;

    registrationRepoMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    registrationRepository =
      registrationRepoMock as unknown as Repository<EventRegistration>;

    jest.clearAllMocks();
    service = new EventsService(eventRepository, registrationRepository);
  });

  it('creates event with organizer and defaults', async () => {
    const dto = {
      title: 'Test Event',
      description: 'desc',
      eventType: 'trial' as const,
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      startTime: '10:00:00',
      venueId: 'venue-1',
    };

    const created = { id: 'event-1' } as Event;
    eventRepoMock.create.mockReturnValue(created);
    eventRepoMock.save.mockResolvedValue(created);

    const result = await service.createEvent('user-1', dto);

    expect(eventRepoMock.create).toHaveBeenCalled();
    const eventCreateArgs = (eventRepoMock.create.mock.calls[0] ??
      []) as unknown as [unknown];
    expect(eventCreateArgs[0]).toEqual(
      expect.objectContaining({
        organizer: { id: 'user-1' },
        createdBy: { id: 'user-1' },
        organizer_type: 'scout',
        status: 'pending_approval',
        participantCount: 0,
        venue: { id: 'venue-1' },
      }),
    );
    expect(result).toBe(created);
  });

  it('gets ongoing events ordered by start_date', async () => {
    const qb = createQueryBuilderMock();
    const events = [{ id: 'event-1' } as Event];
    qb.getMany.mockResolvedValue(events);
    eventRepoMock.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getOngoingEvents(5);

    expect(qb.where).toHaveBeenCalledWith('event.status = :status', {
      status: 'approved',
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      'event.start_date >= :now',
      expect.any(Object),
    );
    const andWhereParams = qb.andWhere.mock.calls[0]?.[1] as {
      now?: unknown;
    };
    expect(andWhereParams.now).toBeInstanceOf(Date);

    expect(qb.orderBy).toHaveBeenCalledWith('event.startDate', 'ASC');

    expect(qb.take).toHaveBeenCalledWith(5);
    expect(result).toEqual(events);
  });

  it('prevents registration for non-approved events', async () => {
    const event = { id: 'event-1', status: 'pending_approval' } as Event;
    eventRepoMock.findOne.mockResolvedValue(event);

    await expect(
      service.registerForEvent('event-1', 'player-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('registers player and increments participant count', async () => {
    const event = {
      id: 'event-1',
      status: 'approved',
      maxParticipants: 10,
      participantCount: 0,
      registrationDeadline: null,
    } as Event;

    eventRepoMock.findOne.mockResolvedValue(event);

    // Mock the query builder for duplicate check
    const qb = createQueryBuilderMock();
    qb.getOne.mockResolvedValue(null);
    registrationRepoMock.createQueryBuilder.mockReturnValue(qb);

    const registration = { id: 'reg-1' } as EventRegistration;
    registrationRepoMock.create.mockReturnValue(registration);
    registrationRepoMock.save.mockResolvedValue(registration);
    eventRepoMock.increment.mockResolvedValue({ affected: 1 });

    const result = await service.registerForEvent('event-1', 'player-1');

    expect(registrationRepoMock.create).toHaveBeenCalled();
    const registrationCreateArgs = (registrationRepoMock.create.mock.calls[0] ??
      []) as unknown as [unknown];
    expect(registrationCreateArgs[0]).toEqual(
      expect.objectContaining({
        event: { id: 'event-1' },
        player: { userId: 'player-1' } as PlayerProfile,
        status: 'pending',
      }),
    );
    expect(result).toBe(registration);
    expect(eventRepoMock.increment).toHaveBeenCalledWith(
      { id: 'event-1' },
      'participantCount',
      1,
    );
  });

  it('throws when registration not found on update', async () => {
    registrationRepoMock.findOne.mockResolvedValue(null);

    await expect(
      service.updateRegistration('reg-1', { status: 'approved' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
