import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEventDto, EventQueryDto, UpdateEventDto } from './dtos';
import { Event, User, Venue } from '@/database/entities';
import { HttpError } from '@/common/utils';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}
  private getUserOrThrow = async (userId?: string) => {
    if (!userId) {
      throw HttpError.badRequest('Invalid user');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw HttpError.unauthorized('User not found');
    }

    return user;
  };

  private isAdmin = (user: User) => user.role === 'admin';

  createEvent = async (userId: string, dto: CreateEventDto): Promise<Event> => {
    const creator = await this.getUserOrThrow(userId);
    const organizerType: 'scout' | 'admin' = this.isAdmin(creator)
      ? 'admin'
      : 'scout';

    // TODO: once CurrentUser includes the role, drop this lookup and set organizer_type directly.
    const event = this.eventRepository.create({
      ...dto,
      organizer: { id: userId } as User,
      createdBy: { id: userId } as User,
      organizerType: organizerType,
      status: 'pending_approval',
      participantCount: 0,
      venue: dto.venueId ? { id: dto.venueId } : undefined,
    });

    return this.eventRepository.save(event);
  };

  getOngoingEvents = async (
    query: EventQueryDto = new EventQueryDto(),
  ): Promise<Event[]> => {
    const now = new Date();

    const qb = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.venue', 'venue')
      .leftJoinAndSelect('event.organizer', 'organizer')
      .where('event.status = :status', { status: 'approved' })
      .andWhere('event.startDate <= :now', { now })
      .andWhere('event.endDate >= :now', { now });

    if (query.eventType) {
      qb.andWhere('event.eventType = :eventType', {
        eventType: query.eventType,
      });
    }

    if (query.search) {
      qb.andWhere(
        '(event.title ILIKE :search OR event.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.city) {
      qb.andWhere('venue.city ILIKE :city', { city: `%${query.city}%` });
    }

    if (query.country) {
      qb.andWhere('venue.country ILIKE :country', {
        country: `%${query.country}%`,
      });
    }

    qb.orderBy('event.startDate', 'ASC').take(query.limit ?? 10);

    return qb.getMany();
  };

  getEvents = async (
    query: EventQueryDto,
  ): Promise<{ data: Event[]; total: number }> => {
    const qb = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.venue', 'venue')
      .leftJoinAndSelect('event.organizer', 'organizer');

    if (query.eventType) {
      qb.andWhere('event.eventType = :eventType', {
        eventType: query.eventType,
      });
    }

    if (query.status) {
      qb.andWhere('event.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(event.title ILIKE :search OR event.description ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.city) {
      qb.andWhere('venue.city ILIKE :city', { city: `%${query.city}%` });
    }

    if (query.country) {
      qb.andWhere('venue.country ILIKE :country', {
        country: `%${query.country}%`,
      });
    }

    qb.orderBy('event.startDate', 'DESC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 20);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  };

  getEventById = async (eventId: string): Promise<Event> => {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: [
        'venue',
        'organizer',
        'approvedBy',
        'registrations',
        'registrations.player',
        'registrations.player.user',
      ],
    });

    if (!event) {
      throw HttpError.notFound('Event not found');
    }

    return event;
  };

  updateEvent = async (
    eventId: string,
    userId: string,
    dto: UpdateEventDto,
  ): Promise<Event> => {
    const event = await this.getEventById(eventId);
    const requester = await this.getUserOrThrow(userId);

    if (event.organizer.id !== userId && !this.isAdmin(requester)) {
      throw HttpError.forbidden('Not authorized to update this event');
    }

    Object.assign(event, dto);

    if (dto.venueId) {
      event.venue = { id: dto.venueId } as Venue;
    }

    const saved = await this.eventRepository.save(event);
    this.notifyEventUpdated(saved, userId);
    return saved;
  };

  approveEvent = async (
    eventId: string,
    adminId: string,
    approve: boolean,
    rejectionReason?: string,
  ): Promise<Event> => {
    const admin = await this.getUserOrThrow(adminId);

    if (!this.isAdmin(admin)) {
      throw HttpError.forbidden('Only admins can approve events');
    }

    const event = await this.getEventById(eventId);

    if (event.status !== 'pending_approval') {
      throw HttpError.badRequest('Event is not pending approval');
    }

    event.status = approve ? 'approved' : 'rejected';
    event.approvedBy = { id: adminId } as User;
    event.approvedAt = new Date();

    if (!approve && rejectionReason) {
      event.rejectionReason = rejectionReason;
    }

    const saved = await this.eventRepository.save(event);
    this.notifyEventApprovalStatus(saved, approve, rejectionReason);
    return saved;
  };

  deleteEvent = async (eventId: string, userId: string): Promise<void> => {
    const event = await this.getEventById(eventId);
    const requester = await this.getUserOrThrow(userId);

    if (event.organizer.id !== userId && !this.isAdmin(requester)) {
      throw HttpError.forbidden('Not authorized to delete this event');
    }

    this.notifyEventCancelled(event, userId);
    await this.eventRepository.remove(event);
  };

  private notifyEventApprovalStatus(
    event: Event,
    approved: boolean,
    rejectionReason?: string,
  ): void {
    const organizerId = event.organizer?.id;
    if (!organizerId || event.approvedBy?.id === organizerId) {
      return;
    }

    const status = approved ? 'approved' : 'rejected';
    this.eventEmitter.emit('notification.create', {
      userId: organizerId,
      actorId: event.approvedBy?.id,
      title: approved ? 'Event approved' : 'Event rejected',
      message: approved
        ? `"${event.title}" was approved.`
        : `"${event.title}" was rejected.${rejectionReason ? ` ${rejectionReason}` : ''}`,
      type: 'event_updated',
      referenceId: event.id,
      referenceType: 'event',
      preference: 'eventUpdates',
      dedupeKey: `event_status:${event.id}:${status}`,
      data: {
        eventId: event.id,
        status,
      },
      email: event.organizer?.email
        ? {
            to: event.organizer.email,
            subject: approved
              ? 'Your NxtPro event was approved'
              : 'Your NxtPro event was rejected',
            message: approved
              ? `"${event.title}" was approved.`
              : `"${event.title}" was rejected.${rejectionReason ? ` ${rejectionReason}` : ''}`,
          }
        : undefined,
    });
  }

  private notifyEventUpdated(event: Event, actorId: string): void {
    const recipients = this.getRegisteredUsers(event).filter(
      user => user.id !== actorId,
    );

    for (const user of recipients) {
      this.eventEmitter.emit('notification.create', {
        userId: user.id,
        actorId,
        title: 'Event updated',
        message: `"${event.title}" was updated.`,
        type: 'event_updated',
        referenceId: event.id,
        referenceType: 'event',
        preference: 'eventUpdates',
        dedupeKey: `event_updated:${event.id}:${event.updatedAt.toISOString()}`,
        data: {
          eventId: event.id,
          actorId,
        },
        email: user.email
          ? {
              to: user.email,
              subject: 'A NxtPro event was updated',
              message: `"${event.title}" was updated.`,
            }
          : undefined,
      });
    }
  }

  private notifyEventCancelled(event: Event, actorId: string): void {
    const recipients = this.getRegisteredUsers(event).filter(
      user => user.id !== actorId,
    );

    for (const user of recipients) {
      this.eventEmitter.emit('notification.create', {
        userId: user.id,
        actorId,
        title: 'Event cancelled',
        message: `"${event.title}" was cancelled.`,
        type: 'event_updated',
        referenceId: event.id,
        referenceType: 'event',
        preference: 'eventUpdates',
        dedupeKey: `event_cancelled:${event.id}`,
        data: {
          eventId: event.id,
          status: 'cancelled',
        },
        email: user.email
          ? {
              to: user.email,
              subject: 'A NxtPro event was cancelled',
              message: `"${event.title}" was cancelled.`,
            }
          : undefined,
      });
    }
  }

  private getRegisteredUsers(event: Event): User[] {
    return (event.registrations ?? [])
      .filter(registration => !registration.cancelled)
      .map(registration => registration.player?.user)
      .filter((user): user is User => Boolean(user?.id));
  }
}
