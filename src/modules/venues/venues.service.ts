import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateVenueDto } from './dtos';
import { Venue } from '@/database/entities';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
  ) {}

  async createVenue(dto: CreateVenueDto): Promise<Venue> {
    const venue = this.venueRepository.create(dto);
    return this.venueRepository.save(venue);
  }

  async getVenues(query: {
    search?: string;
    city?: string;
    country?: string;
    limit?: number;
    offset?: number;
  }): Promise<Venue[]> {
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
      .skip(query.offset || 0)
      .take(query.limit || 20);

    return qb.getMany();
  }

  async getVenueById(venueId: string): Promise<Venue> {
    const venue = await this.venueRepository.findOne({
      where: { id: venueId },
      relations: ['events'],
    });

    if (!venue) {
      throw new NotFoundException('Venue not found');
    }

    return venue;
  }

  async updateVenue(
    venueId: string,
    dto: Partial<CreateVenueDto>,
  ): Promise<Venue> {
    const venue = await this.getVenueById(venueId);
    Object.assign(venue, dto);
    return this.venueRepository.save(venue);
  }

  async deleteVenue(venueId: string): Promise<void> {
    const venue = await this.getVenueById(venueId);
    await this.venueRepository.remove(venue);
  }
}
