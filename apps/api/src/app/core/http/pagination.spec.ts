import { createPagination, createPaginationMeta } from './pagination';

describe('pagination', () => {
  it('normalizes page and limit and calculates skip once', () => {
    expect(createPagination(3, 25)).toEqual({ page: 3, limit: 25, skip: 50 });
  });

  it('applies safe defaults and a maximum limit', () => {
    expect(createPagination(Number.NaN, 1_000)).toEqual({
      page: 1,
      limit: 100,
      skip: 0,
    });
  });

  it('creates stable response metadata', () => {
    expect(createPaginationMeta(2, 25, 51)).toEqual({
      page: 2,
      limit: 25,
      totalItems: 51,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });
});
