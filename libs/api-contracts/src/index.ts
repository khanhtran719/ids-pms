export type ServiceAvailability = 'up' | 'down';

export interface SystemHealth {
  status: 'ok' | 'degraded';
  services: {
    api: ServiceAvailability;
    database: ServiceAvailability;
  };
  timestamp: string;
}

export interface LivenessHealth {
  status: 'ok';
  services: {
    api: 'up';
  };
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  path: string;
  requestId: string;
  timestamp: string;
  details?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
