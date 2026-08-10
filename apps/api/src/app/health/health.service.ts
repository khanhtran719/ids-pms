import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import {
  DatabaseConnectionState,
  HealthStatus,
  LivenessStatus,
} from './health.types';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection()
    private readonly databaseConnection: DatabaseConnectionState,
  ) {}

  getLiveness(): LivenessStatus {
    return {
      status: 'ok',
      services: { api: 'up' },
      timestamp: new Date().toISOString(),
    };
  }

  getStatus(): HealthStatus {
    const databaseIsAvailable = this.databaseConnection.readyState === 1;

    return {
      status: databaseIsAvailable ? 'ok' : 'degraded',
      services: {
        api: 'up',
        database: databaseIsAvailable ? 'up' : 'down',
      },
      timestamp: new Date().toISOString(),
    };
  }

  getReadiness(): HealthStatus {
    const status = this.getStatus();
    if (status.services.database !== 'up') {
      throw new ServiceUnavailableException({
        code: 'DATABASE_NOT_READY',
        message: 'Database is not ready',
        details: status,
      });
    }

    return status;
  }
}
