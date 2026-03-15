import {
  DeepPartial,
  DeleteResult,
  EntityManager,
  FindManyOptions,
  FindOneOptions,
  FindOptionsOrder,
  FindOptionsWhere,
  ObjectLiteral,
  QueryDeepPartialEntity,
  Repository,
  UpdateResult,
} from 'typeorm';

export interface IPaginate<T> {
  count: number;
  pageSize: number;
  pages: number;
  page: number;
  documents: T[];
}

export interface EntityUlid {
  id: string;
}

export abstract class BaseRepository<TEntity extends ObjectLiteral> {
  protected readonly repository: Repository<TEntity>;

  protected constructor(repository: Repository<TEntity>) {
    this.repository = repository;
  }

  async create(data: DeepPartial<TEntity>): Promise<TEntity> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async findOne(options: FindOneOptions<TEntity>): Promise<TEntity | null> {
    return this.repository.findOne(options);
  }

  async findById(id: TEntity['id']): Promise<TEntity | null> {
    return this.repository.findOneBy({ id } as FindOptionsWhere<TEntity>);
  }

  async find(options?: FindManyOptions<TEntity>): Promise<TEntity[]> {
    return this.repository.find(options);
  }

  async paginate({
    filter,
    order,
    page = 1,
    limit = 10,
  }: {
    filter?: FindOptionsWhere<TEntity>;
    order?: FindOptionsOrder<TEntity>;
    page?: number;
    limit?: number;
  }): Promise<IPaginate<TEntity>> {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(100, limit));

    const skip = (page - 1) * limit;

    const [documents, count] = await this.repository.findAndCount({
      where: filter,
      order,
      take: limit,
      skip,
    });

    return {
      count,
      pageSize: limit,
      pages: Math.ceil(count / limit),
      page,
      documents,
    };
  }

  async updateOne(
    filter: FindOptionsWhere<TEntity>,
    data: QueryDeepPartialEntity<TEntity>,
  ): Promise<UpdateResult> {
    return this.repository.update(filter, data);
  }

  async softDelete(filter: FindOptionsWhere<TEntity>): Promise<UpdateResult> {
    return this.repository.softDelete(filter);
  }

  async restore(filter: FindOptionsWhere<TEntity>): Promise<UpdateResult> {
    return this.repository.restore(filter);
  }

  async delete(filter: FindOptionsWhere<TEntity>): Promise<DeleteResult> {
    return this.repository.delete(filter);
  }

  async exists(filter: FindOptionsWhere<TEntity>): Promise<boolean> {
    return this.repository.exists({ where: filter });
  }

  async runInTransaction<T>(
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.repository.manager.connection.transaction(work);
  }
}
