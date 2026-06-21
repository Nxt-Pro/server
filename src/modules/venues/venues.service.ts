import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVenueDto, UpdateVenueDto, VenueQueryDto } from './dtos';
import { CacheService } from '@/common/cache';
import { HttpError } from '@/common/utils';
import { User, Venue } from '@/database/entities';

const VENUE_LIST_CACHE_PREFIX = 'venues:list:v1:';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Optional()
    private readonly cacheService?: CacheService,
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
    const savedVenue = await this.venueRepository.save(venue);
    await this.invalidateVenueListCache();
    return savedVenue;
  };

  getVenues = async (
    query: VenueQueryDto,
  ): Promise<{ data: Venue[]; total: number }> => {
    const loadVenues = () => this.loadVenues(query);
    if (!this.cacheService) {
      return loadVenues();
    }

    return this.cacheService.getOrSet(
      this.getVenueListCacheKey(query),
      this.cacheService.getDefaultTtlSeconds(),
      loadVenues,
    );
  };

  private loadVenues = async (
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
    const savedVenue = await this.venueRepository.save(venue);
    await this.invalidateVenueListCache();
    return savedVenue;
  };

  deleteVenue = async (venueId: string, userId: string): Promise<void> => {
    await this.ensureAdmin(userId);
    const venue = await this.getVenueById(venueId);
    await this.venueRepository.remove(venue);
    await this.invalidateVenueListCache();
  };

  private getVenueListCacheKey(query: VenueQueryDto): string {
    const normalized = {
      search: this.normalizeCachePart(query.search),
      city: this.normalizeCachePart(query.city),
      country: this.normalizeCachePart(query.country),
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    };

    return `${VENUE_LIST_CACHE_PREFIX}${[
      `search=${encodeURIComponent(normalized.search)}`,
      `city=${encodeURIComponent(normalized.city)}`,
      `country=${encodeURIComponent(normalized.country)}`,
      `limit=${normalized.limit}`,
      `offset=${normalized.offset}`,
    ].join(':')}`;
  }

  private normalizeCachePart(value?: string): string {
    return value?.trim().toLowerCase() ?? '';
  }

  private async invalidateVenueListCache(): Promise<void> {
    await this.cacheService?.deleteByPrefix(VENUE_LIST_CACHE_PREFIX);
  }
}
