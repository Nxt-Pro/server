import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EventsService } from '../../../src/modules/events/events.service';
import { Event, EventRegistration, PlayerProfile } from '@/database/entities';

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */

const createQueryBuilderMock = () => {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  return qb;
};

describe('EventsService', () => {
  let service: EventsService;
  let eventRepository: Repository<Event>;
  let registrationRepository: Repository<EventRegistration>;

  beforeEach(() => {
    eventRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      remove: jest.fn(),
      increment: jest.fn(),
    } as unknown as Repository<Event>;

    registrationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as Repository<EventRegistration>;

    jest.clearAllMocks();
    service = new EventsService(eventRepository, registrationRepository);
  });

  it('creates event with organizer and defaults', async () => {
    const dto = {
      title: 'Test Event',
      description: 'desc',
      eventType: 'trial',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      startTime: '10:00:00',
      venueId: 'venue-1',
    };

    const created = { id: 'event-1' } as Event;
    eventRepository.create.mockReturnValue(created);
    eventRepository.save.mockResolvedValue(created);

    const result = await service.createEvent('user-1', dto);

    expect(eventRepository.create).toHaveBeenCalledWith(
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
    eventRepository.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getOngoingEvents(5);

    expect(qb.where).toHaveBeenCalledWith('event.status = :status', {
      status: 'approved',
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      'event.start_date >= :now',
      expect.objectContaining({ now: expect.any(Date) }),
    );
    expect(qb.orderBy).toHaveBeenCalledWith('event.startDate', 'ASC');
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(result).toEqual(events);
  });

  it('prevents registration for non-approved events', async () => {
    const event = { id: 'event-1', status: 'pending_approval' } as Event;
    eventRepository.findOne.mockResolvedValue(event);

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

    eventRepository.findOne.mockResolvedValue(event);

    // Mock the query builder for duplicate check
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null), // No existing registration
    };
    registrationRepository.createQueryBuilder.mockReturnValue(qb);

    const registration = { id: 'reg-1' } as EventRegistration;
    registrationRepository.create.mockReturnValue(registration);
    registrationRepository.save.mockResolvedValue(registration);
    eventRepository.increment.mockResolvedValue({ affected: 1 });

    const result = await service.registerForEvent('event-1', 'player-1');

    expect(registrationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: { id: 'event-1' },
        player: { userId: 'player-1' } as PlayerProfile,
        status: 'pending',
      }),
    );
    expect(result).toBe(registration);
    expect(eventRepository.increment).toHaveBeenCalledWith(
      { id: 'event-1' },
      'participantCount',
      1,
    );
  });

  it('throws when registration not found on update', async () => {
    registrationRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updateRegistration('reg-1', { status: 'approved' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
