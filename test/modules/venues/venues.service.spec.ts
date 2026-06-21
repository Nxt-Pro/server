import { Repository } from 'typeorm';
import { CacheService } from '@/common/cache';
import { HttpError } from '@/common/utils';
import { User, Venue } from '@/database/entities';
import { CreateVenueDto, VenueQueryDto } from '@/modules/venues/dtos';
import { VenuesService } from '@/modules/venues/venues.service';

type VenueQueryBuilderMock = {
  andWhere: jest.MockedFunction<(...args: unknown[]) => VenueQueryBuilderMock>;
  orderBy: jest.MockedFunction<(...args: unknown[]) => VenueQueryBuilderMock>;
  skip: jest.MockedFunction<(skip: number) => VenueQueryBuilderMock>;
  take: jest.MockedFunction<(take: number) => VenueQueryBuilderMock>;
  getManyAndCount: jest.MockedFunction<() => Promise<[Venue[], number]>>;
};

const createVenueQueryBuilderMock = (): VenueQueryBuilderMock => {
  const qb: Partial<VenueQueryBuilderMock> = {};
  qb.andWhere = jest.fn(() => qb as VenueQueryBuilderMock);
  qb.orderBy = jest.fn(() => qb as VenueQueryBuilderMock);
  qb.skip = jest.fn((_skip: number) => qb as VenueQueryBuilderMock);
  qb.take = jest.fn((_take: number) => qb as VenueQueryBuilderMock);
  qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  return qb as VenueQueryBuilderMock;
};

describe('VenuesService', () => {
  let service: VenuesService;
  let venueRepoMock: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
    remove: jest.Mock;
  };
  let userRepoMock: { findOne: jest.Mock };

  beforeEach(() => {
    venueRepoMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      remove: jest.fn(),
    };

    userRepoMock = {
      findOne: jest.fn(),
    };

    service = new VenuesService(
      venueRepoMock as unknown as Repository<Venue>,
      userRepoMock as unknown as Repository<User>,
    );
  });

  it('creates a venue when requester is admin', async () => {
    const dto: CreateVenueDto = { name: 'Stadium', address: 'Address' };
    const venue = { id: 'venue-1' } as Venue;

    userRepoMock.findOne.mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
    } as User);
    venueRepoMock.create.mockReturnValue(venue);
    venueRepoMock.save.mockResolvedValue(venue);

    const result = await service.createVenue('admin-1', dto);

    expect(venueRepoMock.create).toHaveBeenCalledWith(dto);
    expect(result).toBe(venue);
  });

  it('blocks non-admins from creating venues', async () => {
    userRepoMock.findOne.mockResolvedValue({
      id: 'user-1',
      role: 'player',
    } as User);

    const badDto: CreateVenueDto = { name: 'n', address: 'a' };

    await expect(service.createVenue('user-1', badDto)).rejects.toBeInstanceOf(
      HttpError,
    );
  });

  it('gets venues with filters and pagination', async () => {
    const qb = createVenueQueryBuilderMock();
    const venues: Venue[] = [{ id: 'venue-1' } as Venue];
    qb.getManyAndCount.mockResolvedValue([venues, 1]);
    venueRepoMock.createQueryBuilder.mockReturnValue(qb);

    const query = new VenueQueryDto();
    query.search = 'stadium';
    query.city = 'Cairo';
    query.country = 'EG';
    query.limit = 5;
    query.offset = 10;

    const result = await service.getVenues(query);

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
    expect(result).toEqual({ data: venues, total: 1 });
  });

  it('caches venue list lookups with an explicit key and ttl', async () => {
    const qb = createVenueQueryBuilderMock();
    const venues: Venue[] = [{ id: 'venue-1' } as Venue];
    qb.getManyAndCount.mockResolvedValue([venues, 1]);
    venueRepoMock.createQueryBuilder.mockReturnValue(qb);

    const cacheServiceMock = {
      getDefaultTtlSeconds: jest.fn().mockReturnValue(123),
      getOrSet: jest.fn(
        async (
          _key: string,
          _ttlSeconds: number,
          loader: () => Promise<{ data: Venue[]; total: number }>,
        ) => loader(),
      ),
    };
    service = new VenuesService(
      venueRepoMock as unknown as Repository<Venue>,
      userRepoMock as unknown as Repository<User>,
      cacheServiceMock as unknown as CacheService,
    );

    const query = new VenueQueryDto();
    query.search = ' Stadium ';
    query.city = 'Cairo';
    query.country = 'EG';
    query.limit = 5;
    query.offset = 10;

    const result = await service.getVenues(query);

    expect(cacheServiceMock.getOrSet).toHaveBeenCalledWith(
      'venues:list:v1:search=stadium:city=cairo:country=eg:limit=5:offset=10',
      123,
      expect.any(Function),
    );
    expect(result).toEqual({ data: venues, total: 1 });
  });

  it('invalidates venue list cache after creating a venue', async () => {
    const cacheServiceMock = {
      deleteByPrefix: jest.fn().mockResolvedValue(undefined),
    };
    service = new VenuesService(
      venueRepoMock as unknown as Repository<Venue>,
      userRepoMock as unknown as Repository<User>,
      cacheServiceMock as unknown as CacheService,
    );
    const dto: CreateVenueDto = { name: 'Stadium', address: 'Address' };
    const venue = { id: 'venue-1' } as Venue;

    userRepoMock.findOne.mockResolvedValue({
      id: 'admin-1',
      role: 'admin',
    } as User);
    venueRepoMock.create.mockReturnValue(venue);
    venueRepoMock.save.mockResolvedValue(venue);

    await service.createVenue('admin-1', dto);

    expect(cacheServiceMock.deleteByPrefix).toHaveBeenCalledWith(
      'venues:list:v1:',
    );
  });

  it('throws HttpError when venue not found', async () => {
    venueRepoMock.findOne.mockResolvedValue(null);

    await expect(service.getVenueById('venue-1')).rejects.toBeInstanceOf(
      HttpError,
    );
  });
});
