export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

function positiveIntegerOr(value: number, fallback: number): number {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function createPagination(
  pageValue: number,
  limitValue: number,
): Pagination {
  const page = positiveIntegerOr(pageValue, 1);
  const requestedLimit = positiveIntegerOr(limitValue, DEFAULT_PAGE_SIZE);
  const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function createPaginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

import type { PaginationMeta } from '@project-ql/api-contracts';

export type {
  PaginatedResponse,
  PaginationMeta,
} from '@project-ql/api-contracts';
