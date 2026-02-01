export type QueryBuilderMock<T = unknown> = {
  leftJoinAndSelect: jest.MockedFunction<
    (...args: unknown[]) => QueryBuilderMock<T>
  >;
  where: jest.MockedFunction<(...args: unknown[]) => QueryBuilderMock<T>>;
  andWhere: jest.MockedFunction<(...args: unknown[]) => QueryBuilderMock<T>>;
  orderBy: jest.MockedFunction<(...args: unknown[]) => QueryBuilderMock<T>>;
  take: jest.MockedFunction<(take: number) => QueryBuilderMock<T>>;
  skip: jest.MockedFunction<(skip: number) => QueryBuilderMock<T>>;
  getMany: jest.MockedFunction<() => Promise<T[]>>;
  getOne: jest.MockedFunction<() => Promise<T | null>>;
};

export function createQueryBuilderMock<T = unknown>(): QueryBuilderMock<T> {
  const qb: Partial<QueryBuilderMock<T>> = {};

  qb.leftJoinAndSelect = jest.fn(() => qb as QueryBuilderMock<T>);
  qb.where = jest.fn(() => qb as QueryBuilderMock<T>);
  qb.andWhere = jest.fn(() => qb as QueryBuilderMock<T>);
  qb.orderBy = jest.fn(() => qb as QueryBuilderMock<T>);
  qb.take = jest.fn((_take: number) => qb as QueryBuilderMock<T>);
  qb.skip = jest.fn((_skip: number) => qb as QueryBuilderMock<T>);
  qb.getMany = jest.fn().mockResolvedValue([] as T[]);
  qb.getOne = jest.fn().mockResolvedValue(null as T | null);

  return qb as QueryBuilderMock<T>;
}
