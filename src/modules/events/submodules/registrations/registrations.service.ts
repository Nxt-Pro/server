import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateRegistrationDto } from '../../dtos';
import {
  Event,
  EventRegistration,
  PlayerProfile,
  User,
} from '@/database/entities';
import { HttpError } from '@/common/utils';

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EventRegistration)
    private readonly registrationRepository: Repository<EventRegistration>,
    @InjectRepository(PlayerProfile)
    private readonly playerProfileRepository: Repository<PlayerProfile>,
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

  private ensureAdmin = async (userId: string) => {
    const user = await this.getUserOrThrow(userId);
    if (user.role !== 'admin') {
      throw HttpError.forbidden('Only admins can perform this action');
    }
    return user;
  };

  registerForEvent = async (
    eventId: string,
    playerId: string,
  ): Promise<EventRegistration> => {
    const playerProfile = await this.playerProfileRepository.findOne({
      where: { userId: playerId },
    });

    if (!playerProfile) {
      throw HttpError.notFound('Player profile not found');
    }

    const playerUser = await this.getUserOrThrow(playerId);

    const result = await this.registrationRepository.manager.transaction(
      async manager => {
        const event = await manager.findOne(Event, {
          where: { id: eventId },
          relations: ['organizer'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!event) {
          throw HttpError.notFound('Event not found');
        }

        if (event.status !== 'approved') {
          throw HttpError.badRequest('Event is not approved');
        }

        if (
          event.maxParticipants > 0 &&
          event.participantCount >= event.maxParticipants
        ) {
          throw HttpError.badRequest('Event is full');
        }

        if (
          event.registrationDeadline &&
          new Date() > new Date(event.registrationDeadline)
        ) {
          throw HttpError.badRequest('Registration deadline has passed');
        }

        const existing = await manager
          .createQueryBuilder(EventRegistration, 'registration')
          .setLock('pessimistic_read')
          .where('registration.event_id = :eventId', { eventId })
          .andWhere('registration.player_id = :playerId', { playerId })
          .andWhere('registration.cancelled = false')
          .getOne();

        if (existing) {
          throw HttpError.conflict('Already registered for this event');
        }

        const registration = manager.create(EventRegistration, {
          event: { id: eventId } as Event,
          player: { userId: playerId } as PlayerProfile,
          status: 'pending',
          registeredAt: new Date(),
        });

        const saved = await manager.save(registration);

        event.participantCount = (event.participantCount ?? 0) + 1;
        await manager.save(event);

        return { registration: saved, event };
      },
    );

    this.notifyRegistrationSubmitted(result.event, playerUser);

    return (
      (await this.registrationRepository.findOne({
        where: { id: result.registration.id },
        relations: ['event', 'player', 'player.user'],
      })) ?? result.registration
    );
  };

  getEventRegistrations = async (
    eventId: string,
  ): Promise<EventRegistration[]> => {
    return this.registrationRepository.find({
      where: { event: { id: eventId } },
      relations: ['player', 'player.user'],
      order: { registeredAt: 'DESC' },
    });
  };

  updateRegistration = async (
    registrationId: string,
    adminId: string,
    dto: UpdateRegistrationDto,
  ): Promise<EventRegistration> => {
    await this.ensureAdmin(adminId);

    const registration = await this.registrationRepository.findOne({
      where: { id: registrationId },
      relations: ['event', 'player', 'player.user'],
    });

    if (!registration) {
      throw HttpError.notFound('Registration not found');
    }

    const previousStatus = registration.status;
    Object.assign(registration, dto);
    const saved = await this.registrationRepository.save(registration);

    if (dto.status && dto.status !== previousStatus) {
      this.notifyRegistrationStatusChanged(saved, dto.status, adminId);
    }

    return saved;
  };

  cancelRegistration = async (
    registrationId: string,
    userId: string,
  ): Promise<EventRegistration> => {
    const user = await this.getUserOrThrow(userId);

    const result = await this.registrationRepository.manager.transaction(
      async manager => {
        const registration = await manager.findOne(EventRegistration, {
          where: { id: registrationId },
          relations: ['event', 'event.organizer', 'player', 'player.user'],
          lock: { mode: 'pessimistic_write' },
        });

        if (!registration) {
          throw HttpError.notFound('Registration not found');
        }

        if (registration.player.user.id !== user.id) {
          throw HttpError.forbidden(
            'Not authorized to cancel this registration',
          );
        }

        if (registration.cancelled) {
          return { registration, cancelledNow: false };
        }

        registration.cancelled = true;
        await manager.save(registration);

        const event = registration.event;
        if (event.participantCount > 0) {
          event.participantCount -= 1;
          await manager.save(event);
        }

        return { registration, cancelledNow: true };
      },
    );

    if (result.cancelledNow) {
      this.notifyRegistrationCancelled(result.registration, user.id);
    }

    return result.registration;
  };

  private notifyRegistrationSubmitted(event: Event, player: User): void {
    const organizerId = event.organizer?.id;

    if (organizerId && organizerId !== player.id) {
      this.eventEmitter.emit('notification.create', {
        userId: organizerId,
        actorId: player.id,
        title: 'New event registration',
        message: `${this.getDisplayName(player)} registered for "${event.title}".`,
        type: 'event_registration',
        referenceId: event.id,
        referenceType: 'event',
        preference: 'eventUpdates',
        dedupeKey: `event_registration_submitted:${event.id}:${player.id}`,
        data: {
          eventId: event.id,
          playerId: player.id,
          status: 'submitted',
        },
        email: event.organizer?.email
          ? {
              to: event.organizer.email,
              subject: 'New NxtPro event registration',
              message: `${this.getDisplayName(player)} registered for "${event.title}".`,
            }
          : undefined,
      });
    }
  }

  private notifyRegistrationStatusChanged(
    registration: EventRegistration,
    status: 'pending' | 'approved' | 'rejected',
    actorId: string,
  ): void {
    const player = registration.player?.user;
    const event = registration.event;

    if (!player?.id || !event?.id) {
      return;
    }

    this.eventEmitter.emit('notification.create', {
      userId: player.id,
      actorId,
      title: 'Registration status updated',
      message: `Your registration for "${event.title}" is now ${status}.`,
      type: 'event_registration',
      referenceId: event.id,
      referenceType: 'event',
      preference: 'eventUpdates',
      dedupeKey: `event_registration_status:${registration.id}:${status}`,
      data: {
        eventId: event.id,
        registrationId: registration.id,
        status,
      },
      email:
        (status === 'approved' || status === 'rejected') && player.email
          ? {
              to: player.email,
              subject:
                status === 'approved'
                  ? 'Your NxtPro event registration was accepted'
                  : 'Your NxtPro event registration was rejected',
              message: `Your registration for "${event.title}" is now ${status}.`,
            }
          : undefined,
    });
  }

  private notifyRegistrationCancelled(
    registration: EventRegistration,
    actorId: string,
  ): void {
    const event = registration.event;
    const organizerId = event?.organizer?.id;

    if (!event?.id || !organizerId || organizerId === actorId) {
      return;
    }

    this.eventEmitter.emit('notification.create', {
      userId: organizerId,
      actorId,
      title: 'Registration cancelled',
      message: `${this.getDisplayName(registration.player?.user)} cancelled their registration for "${event.title}".`,
      type: 'event_registration',
      referenceId: event.id,
      referenceType: 'event',
      preference: 'eventUpdates',
      dedupeKey: `event_registration_cancelled:${registration.id}`,
      data: {
        eventId: event.id,
        registrationId: registration.id,
        status: 'cancelled',
      },
      email: event.organizer?.email
        ? {
            to: event.organizer.email,
            subject: 'A NxtPro event registration was cancelled',
            message: `${this.getDisplayName(registration.player?.user)} cancelled their registration for "${event.title}".`,
          }
        : undefined,
    });
  }

  private getDisplayName(user?: User | null): string {
    return (
      user?.playerProfile?.fullName ??
      user?.scoutProfile?.fullName ??
      user?.username ??
      user?.email ??
      'Someone'
    );
  }
}
