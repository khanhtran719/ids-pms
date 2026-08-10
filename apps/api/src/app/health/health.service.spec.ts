import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports liveness without depending on MongoDB', () => {
    const service = new HealthService({ readyState: 0 });

    expect(service.getLiveness()).toEqual({
      status: 'ok',
      services: { api: 'up' },
      timestamp: expect.any(String),
    });
  });

  it('reports the API and database as available when MongoDB is connected', () => {
    const service = new HealthService({ readyState: 1 });

    expect(service.getStatus()).toEqual({
      status: 'ok',
      services: {
        api: 'up',
        database: 'up',
      },
      timestamp: expect.any(String),
    });
  });

  it('reports a degraded status when MongoDB is not connected', () => {
    const service = new HealthService({ readyState: 0 });

    expect(service.getStatus()).toEqual({
      status: 'degraded',
      services: {
        api: 'up',
        database: 'down',
      },
      timestamp: expect.any(String),
    });
  });

  it('throws a service unavailable error when readiness checks fail', () => {
    const service = new HealthService({ readyState: 0 });

    expect(() => service.getReadiness()).toThrow('Database is not ready');
  });
});
