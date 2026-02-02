import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVenueDto, UpdateVenueDto, VenueQueryDto } from './dtos';
import { User, Venue } from '@/database/entities';
import { HttpError } from '@/common/utils';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
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
      throw HttpError.forbidden('Only admins can manage venues');
    }

    return user;
  };

  createVenue = async (userId: string, dto: CreateVenueDto): Promise<Venue> => {
    await this.ensureAdmin(userId);
    const venue = this.venueRepository.create(dto);
    return this.venueRepository.save(venue);
  };

  getVenues = async (
    query: VenueQueryDto,
  ): Promise<{ data: Venue[]; total: number }> => {
    const qb = this.venueRepository.createQueryBuilder('venue');

    if (query.search) {
      qb.andWhere('(venue.name ILIKE :search OR venue.address ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    if (query.city) {
      qb.andWhere('venue.city ILIKE :city', { city: `%${query.city}%` });
    }

    if (query.country) {
      qb.andWhere('venue.country ILIKE :country', {
        country: `%${query.country}%`,
      });
    }

    qb.orderBy('venue.name', 'ASC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 20);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  };

  getVenueById = async (venueId: string): Promise<Venue> => {
    const venue = await this.venueRepository.findOne({
      where: { id: venueId },
      relations: ['events'],
    });

    if (!venue) {
      throw HttpError.notFound('Venue not found');
    }

    return venue;
  };

  updateVenue = async (
    venueId: string,
    userId: string,
    dto: UpdateVenueDto,
  ): Promise<Venue> => {
    await this.ensureAdmin(userId);
    const venue = await this.getVenueById(venueId);
    Object.assign(venue, dto);
    return this.venueRepository.save(venue);
  };

  deleteVenue = async (venueId: string, userId: string): Promise<void> => {
    await this.ensureAdmin(userId);
    const venue = await this.getVenueById(venueId);
    await this.venueRepository.remove(venue);
  };
}
