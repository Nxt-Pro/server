import { Injectable } from '@nestjs/common';
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

    return this.registrationRepository.manager.transaction(async manager => {
      const event = await manager.findOne(Event, {
        where: { id: eventId },
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
        registered_at: new Date(),
      });

      const saved = await manager.save(registration);

      event.participantCount = (event.participantCount ?? 0) + 1;
      await manager.save(event);

      return saved;
    });
  };

  getEventRegistrations = async (
    eventId: string,
  ): Promise<EventRegistration[]> => {
    return this.registrationRepository.find({
      where: { event: { id: eventId } },
      relations: ['player', 'player.user'],
      order: { registered_at: 'DESC' },
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
      relations: ['event', 'player'],
    });

    if (!registration) {
      throw HttpError.notFound('Registration not found');
    }

    Object.assign(registration, dto);
    return this.registrationRepository.save(registration);
  };

  cancelRegistration = async (
    registrationId: string,
    userId: string,
  ): Promise<EventRegistration> => {
    const user = await this.getUserOrThrow(userId);

    return this.registrationRepository.manager.transaction(async manager => {
      const registration = await manager.findOne(EventRegistration, {
        where: { id: registrationId },
        relations: ['event', 'player', 'player.user'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!registration) {
        throw HttpError.notFound('Registration not found');
      }

      if (registration.player.user.id !== user.id) {
        throw HttpError.forbidden('Not authorized to cancel this registration');
      }

      if (registration.cancelled) {
        return registration;
      }

      registration.cancelled = true;
      await manager.save(registration);

      const event = registration.event;
      if (event.participantCount > 0) {
        event.participantCount -= 1;
        await manager.save(event);
      }

      return registration;
    });
  };
}
