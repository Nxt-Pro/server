import {
  Event,
  EventRegistration,
  PlayerProfile,
  User,
  Venue,
} from '@/database/entities';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEventDto, UpdateEventDto, UpdateRegistrationDto } from './dtos';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EventRegistration)
    private readonly registrationRepository: Repository<EventRegistration>,
  ) {}

  async createEvent(userId: string, dto: CreateEventDto): Promise<Event> {
    const event = this.eventRepository.create({
      ...dto,
      organizer: { id: userId } as User,
      createdBy: { id: userId } as User,
      organizer_type: 'scout', // Could be determined from user role
      status: 'pending_approval',
      participantCount: 0,
      venue: dto.venueId ? { id: dto.venueId } : undefined,
    });

    return this.eventRepository.save(event);
  }

  async getOngoingEvents(limit = 10): Promise<Event[]> {
    return this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.venue', 'venue')
      .leftJoinAndSelect('event.organizer', 'organizer')
      .where('event.status = :status', { status: 'approved' })
      .andWhere('event.start_date >= :now', { now: new Date() })
      .orderBy('event.startDate', 'ASC')
      .take(limit)
      .getMany();
  }

  async getEvents(query: {
    eventType?: 'tournament' | 'trial' | 'workshop';
    status?: 'pending_approval' | 'approved' | 'rejected';
    search?: string;
    city?: string;
    country?: string;
    limit?: number;
    offset?: number;
  }): Promise<Event[]> {
    const qb = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.venue', 'venue')
      .leftJoinAndSelect('event.organizer', 'organizer');

    if (query.eventType) {
      qb.andWhere('event.event_type = :eventType', {
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
      .skip(query.offset || 0)
      .take(query.limit || 20);

    return qb.getMany();
  }

  async getEventById(eventId: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['venue', 'organizer', 'approvedBy', 'registrations'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async updateEvent(
    eventId: string,
    userId: string,
    dto: UpdateEventDto,
  ): Promise<Event> {
    const event = await this.getEventById(eventId);

    // Check if user is the organizer or admin
    if (event.organizer.id !== userId) {
      throw new ForbiddenException('Not authorized to update this event');
    }

    Object.assign(event, dto);

    if (dto.venueId) {
      event.venue = { id: dto.venueId } as Venue;
    }

    return this.eventRepository.save(event);
  }

  async approveEvent(
    eventId: string,
    adminId: string,
    approve: boolean,
    rejectionReason?: string,
  ): Promise<Event> {
    const event = await this.getEventById(eventId);

    if (event.status !== 'pending_approval') {
      throw new BadRequestException('Event is not pending approval');
    }

    event.status = approve ? 'approved' : 'rejected';
    event.approvedBy = { id: adminId } as User;
    event.approved_at = new Date();

    if (!approve && rejectionReason) {
      event.rejection_reason = rejectionReason;
    }

    return this.eventRepository.save(event);
  }

  async deleteEvent(eventId: string, userId: string): Promise<void> {
    const event = await this.getEventById(eventId);

    if (event.organizer.id !== userId) {
      throw new ForbiddenException('Not authorized to delete this event');
    }

    await this.eventRepository.remove(event);
  }

  // Event Registration Methods
  async registerForEvent(
    eventId: string,
    playerId: string,
  ): Promise<EventRegistration> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== 'approved') {
      throw new BadRequestException('Event is not approved');
    }

    if (
      event.maxParticipants > 0 &&
      event.participantCount >= event.maxParticipants
    ) {
      throw new BadRequestException('Event is full');
    }

    if (
      event.registrationDeadline &&
      new Date() > new Date(event.registrationDeadline)
    ) {
      throw new BadRequestException('Registration deadline has passed');
    }

    // Check if already registered
    const existing = await this.registrationRepository
      .createQueryBuilder('registration')
      .where('registration.event_id = :eventId', { eventId })
      .andWhere('registration.player_id = :playerId', { playerId })
      .getOne();

    if (existing) {
      throw new BadRequestException('Already registered for this event');
    }

    const registration = this.registrationRepository.create({
      event: { id: eventId } as Event,
      player: { userId: playerId } as PlayerProfile,
      status: 'pending',
      registered_at: new Date(),
    });

    const saved = await this.registrationRepository.save(registration);

    // Update participant count without touching relations
    await this.eventRepository.increment({ id: eventId }, 'participantCount', 1);

    return saved;
  }

  async getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
    return this.registrationRepository.find({
      where: { event: { id: eventId } },
      relations: ['player', 'player.user'],
      order: { registered_at: 'DESC' },
    });
  }

  async updateRegistration(
    registrationId: string,
    dto: UpdateRegistrationDto,
  ): Promise<EventRegistration> {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId },
      relations: ['event', 'player'],
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    Object.assign(registration, dto);
    return this.registrationRepository.save(registration);
  }

  async cancelRegistration(
    registrationId: string,
    userId: string,
  ): Promise<void> {
    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId },
      relations: ['event', 'player', 'player.user'],
    });

    if (!registration) {
      throw new NotFoundException('Registration not found');
    }

    if (registration.player.user.id !== userId) {
      throw new ForbiddenException(
        'Not authorized to cancel this registration',
      );
    }

    registration.cancelled = true;
    await this.registrationRepository.save(registration);

    // Update participant count without touching relations
    await this.eventRepository
      .createQueryBuilder()
      .update(Event)
      .set({
        participantCount: () => 'GREATEST(participant_count - 1, 0)',
      })
      .where('id = :id', { id: registration.event.id })
      .execute();
  }
}
