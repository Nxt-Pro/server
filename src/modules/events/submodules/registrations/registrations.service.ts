import { Injectable, Logger } from '@nestjs/common';
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
import { MailService } from '@/integrations/mail/mail.service';
import { NotificationPreferencesService } from '@/modules/settings';
import { HttpError } from '@/common/utils';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

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
    private readonly mailService: MailService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
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

    await this.notifyRegistrationSubmitted(result.event, playerUser);

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
      await this.notifyRegistrationStatusChanged(saved, dto.status);
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

  private async notifyRegistrationSubmitted(
    event: Event,
    player: User,
  ): Promise<void> {
    const organizerId = event.organizer?.id;

    if (organizerId && organizerId !== player.id) {
      this.eventEmitter.emit('notification.create', {
        userId: organizerId,
        title: 'New event registration',
        message: `${this.getDisplayName(player)} registered for "${event.title}".`,
        type: 'new_event',
        referenceId: event.id,
        preference: 'eventUpdates',
      });
    }

    if (
      player.email &&
      (await this.notificationPreferencesService.allowsEmailNotification(
        player.id,
        'eventUpdates',
      ))
    ) {
      this.sendBestEffortRegistrationSubmittedEmail(player.email, event.title);
    }
  }

  private async notifyRegistrationStatusChanged(
    registration: EventRegistration,
    status: 'pending' | 'approved' | 'rejected',
  ): Promise<void> {
    const player = registration.player?.user;
    const event = registration.event;

    if (!player?.id || !event?.id) {
      return;
    }

    this.eventEmitter.emit('notification.create', {
      userId: player.id,
      title: 'Registration status updated',
      message: `Your registration for "${event.title}" is now ${status}.`,
      type: 'new_event',
      referenceId: event.id,
      preference: 'eventUpdates',
    });

    if (
      (status === 'approved' || status === 'rejected') &&
      player.email &&
      (await this.notificationPreferencesService.allowsEmailNotification(
        player.id,
        'eventUpdates',
      ))
    ) {
      this.sendBestEffortRegistrationStatusEmail(
        player.email,
        event.title,
        status,
      );
    }
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
      title: 'Registration cancelled',
      message: `${this.getDisplayName(registration.player?.user)} cancelled their registration for "${event.title}".`,
      type: 'new_event',
      referenceId: event.id,
      preference: 'eventUpdates',
    });
  }

  private sendBestEffortRegistrationSubmittedEmail(
    email: string,
    eventTitle: string,
  ): void {
    void this.mailService
      .sendEventRegistrationSubmittedEmail(email, eventTitle)
      .catch(error => {
        this.logger.warn(
          `Failed to send registration submitted email: ${this.getErrorMessage(error)}`,
        );
      });
  }

  private sendBestEffortRegistrationStatusEmail(
    email: string,
    eventTitle: string,
    status: 'approved' | 'rejected',
  ): void {
    void this.mailService
      .sendEventRegistrationStatusEmail(email, eventTitle, status)
      .catch(error => {
        this.logger.warn(
          `Failed to send registration status email: ${this.getErrorMessage(error)}`,
        );
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

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
