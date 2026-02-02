import { Repository } from 'typeorm';
import { EventsService } from '@/modules/events/events.service';
import { Event, User, Venue } from '@/database/entities';
import { HttpError } from '@/common/utils';
import { EventQueryDto } from '@/modules/events/dtos';

type EventQueryBuilderMock = {
  leftJoinAndSelect: jest.MockedFunction<
    (...args: unknown[]) => EventQueryBuilderMock
  >;
  where: jest.MockedFunction<(...args: unknown[]) => EventQueryBuilderMock>;
  andWhere: jest.MockedFunction<(...args: unknown[]) => EventQueryBuilderMock>;
  orderBy: jest.MockedFunction<(...args: unknown[]) => EventQueryBuilderMock>;
  skip: jest.MockedFunction<(skip: number) => EventQueryBuilderMock>;
  take: jest.MockedFunction<(take: number) => EventQueryBuilderMock>;
  getMany: jest.MockedFunction<() => Promise<Event[]>>;
  getManyAndCount: jest.MockedFunction<() => Promise<[Event[], number]>>;
};

const createEventQueryBuilderMock = (): EventQueryBuilderMock => {
  const qb: Partial<EventQueryBuilderMock> = {};

  qb.leftJoinAndSelect = jest.fn(() => qb as EventQueryBuilderMock);
  qb.where = jest.fn(() => qb as EventQueryBuilderMock);
  qb.andWhere = jest.fn(() => qb as EventQueryBuilderMock);
  qb.orderBy = jest.fn(() => qb as EventQueryBuilderMock);
  qb.skip = jest.fn(() => qb as EventQueryBuilderMock);
  qb.take = jest.fn(() => qb as EventQueryBuilderMock);
  qb.getMany = jest.fn().mockResolvedValue([] as Event[]);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[] as Event[], 0]);

  return qb as EventQueryBuilderMock;
};

describe('EventsService', () => {
  let service: EventsService;
  let eventRepoMock: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
    remove: jest.Mock;
  };
  let userRepoMock: { findOne: jest.Mock };

  beforeEach(() => {
    eventRepoMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      remove: jest.fn(),
    };

    userRepoMock = {
      findOne: jest.fn(),
    };

    service = new EventsService(
      eventRepoMock as unknown as Repository<Event>,
      userRepoMock as unknown as Repository<User>,
    );
  });

  it('creates event with organizer type derived from role', async () => {
    const dto = {
      title: 'Test Event',
      description: 'desc',
      eventType: 'trial' as const,
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      startTime: '10:00:00',
      venueId: 'venue-1',
    };

    userRepoMock.findOne.mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
    } as User);
    const created = { id: 'event-1' } as Event;
    eventRepoMock.create.mockReturnValue(created);
    eventRepoMock.save.mockResolvedValue(created);

    const result = await service.createEvent('admin-1', dto);

    expect(eventRepoMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        organizer: { id: 'admin-1' },
        createdBy: { id: 'admin-1' },
        organizer_type: 'admin',
        status: 'pending_approval',
        participantCount: 0,
        venue: { id: 'venue-1' } as Venue,
      }),
    );
    expect(result).toBe(created);
  });

  it('filters ongoing events within the current window', async () => {
    const qb = createEventQueryBuilderMock();
    const events: Event[] = [{ id: 'event-1' } as Event];
    qb.getMany.mockResolvedValue(events);
    eventRepoMock.createQueryBuilder.mockReturnValue(qb);

    const query = new EventQueryDto();
    query.limit = 10;

    const result = await service.getOngoingEvents(query);

    expect(qb.where).toHaveBeenCalledWith('event.status = :status', {
      status: 'approved',
    });
    const firstCall = qb.andWhere.mock.calls[0];
    const secondCall = qb.andWhere.mock.calls[1];

    expect(firstCall?.[0]).toBe('event.startDate <= :now');
    expect((firstCall?.[1] as { now?: Date }).now).toBeInstanceOf(Date);

    expect(secondCall?.[0]).toBe('event.endDate >= :now');
    expect((secondCall?.[1] as { now?: Date }).now).toBeInstanceOf(Date);
    expect(qb.orderBy).toHaveBeenCalledWith('event.startDate', 'ASC');
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(result).toEqual(events);
  });

  it('returns paginated events with total', async () => {
    const qb = createEventQueryBuilderMock();
    const event = { id: 'event-1' } as Event;
    const paged: [Event[], number] = [[event], 1];
    qb.getManyAndCount.mockResolvedValue(paged);
    eventRepoMock.createQueryBuilder.mockReturnValue(qb);

    const query = new EventQueryDto();
    query.limit = 5;
    query.offset = 10;

    const result = await service.getEvents(query);

    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(result).toEqual({ data: [event], total: 1 });
  });

  it('blocks non-admins from approving events', async () => {
    userRepoMock.findOne.mockResolvedValue({
      id: 'user-1',
      role: 'scout',
    } as User);

    await expect(
      service.approveEvent('event-1', 'user-1', true),
    ).rejects.toBeInstanceOf(HttpError);
  });

  it('prevents non-owners and non-admins from updating events', async () => {
    const event = {
      id: 'event-1',
      organizer: { id: 'owner-1' } as User,
    } as Event;
    eventRepoMock.findOne.mockResolvedValue(event);
    userRepoMock.findOne.mockResolvedValue({
      id: 'user-2',
      role: 'scout',
    } as User);

    await expect(
      service.updateEvent('event-1', 'user-2', { title: 'New title' }),
    ).rejects.toBeInstanceOf(HttpError);
  });
});
