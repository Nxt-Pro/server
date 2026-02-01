import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VenuesService } from '../../../src/modules/venues/venues.service';
import { createQueryBuilderMock } from '../../helpers/mock.helpers';
import { Venue } from '@/database/entities';

describe('VenuesService', () => {
  let service: VenuesService;
  let venueRepository: Repository<Venue>;
  let venueRepoMock: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(() => {
    venueRepoMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      remove: jest.fn(),
    };
    venueRepository = venueRepoMock as unknown as Repository<Venue>;

    jest.clearAllMocks();
    service = new VenuesService(venueRepository);
  });

  it('creates a venue', async () => {
    const dto = { name: 'Stadium', address: 'Address' };
    const venue = { id: 'venue-1' } as Venue;

    venueRepoMock.create.mockReturnValue(venue);
    venueRepoMock.save.mockResolvedValue(venue);

    const result = await service.createVenue(dto);

    expect(venueRepoMock.create).toHaveBeenCalledWith(dto);
    expect(result).toBe(venue);
  });

  it('gets venues with filters', async () => {
    const qb = createQueryBuilderMock();
    const venues = [{ id: 'venue-1' } as Venue];
    qb.getMany.mockResolvedValue(venues);
    venueRepoMock.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getVenues({
      search: 'stadium',
      city: 'Cairo',
      country: 'EG',
      limit: 5,
      offset: 10,
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      '(venue.name ILIKE :search OR venue.address ILIKE :search)',
      { search: '%stadium%' },
    );

    expect(qb.andWhere).toHaveBeenCalledWith('venue.city ILIKE :city', {
      city: '%Cairo%',
    });

    expect(qb.andWhere).toHaveBeenCalledWith('venue.country ILIKE :country', {
      country: '%EG%',
    });

    expect(qb.orderBy).toHaveBeenCalledWith('venue.name', 'ASC');

    expect(qb.skip).toHaveBeenCalledWith(10);

    expect(qb.take).toHaveBeenCalledWith(5);
    expect(result).toEqual(venues);
  });

  it('throws when venue not found', async () => {
    venueRepoMock.findOne.mockResolvedValue(null);

    await expect(service.getVenueById('venue-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
