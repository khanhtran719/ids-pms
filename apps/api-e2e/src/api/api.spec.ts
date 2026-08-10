import axios from 'axios';

describe('GET /api/v1/health', () => {
  it('should report the API and database as available', async () => {
    const res = await axios.get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      status: 'ok',
      services: {
        api: 'up',
        database: 'up',
      },
      timestamp: expect.any(String),
    });
  });

  it('exposes separate liveness and readiness probes', async () => {
    const [live, ready] = await Promise.all([
      axios.get('/api/v1/health/live'),
      axios.get('/api/v1/health/ready'),
    ]);

    expect(live.data).toEqual({
      status: 'ok',
      services: { api: 'up' },
      timestamp: expect.any(String),
    });
    expect(ready.data.services).toEqual({ api: 'up', database: 'up' });
  });

  it('returns request correlation and baseline security headers', async () => {
    const response = await axios.get('/api/v1/health/live', {
      headers: { 'x-request-id': 'client-request-123' },
    });

    expect(response.headers['x-request-id']).toBe('client-request-123');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('returns the standard error contract without framework internals', async () => {
    const response = await axios.get('/api/v1/not-found', {
      validateStatus: () => true,
    });

    expect(response.status).toBe(404);
    expect(response.data).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Cannot GET /api/v1/not-found',
      path: '/api/v1/not-found',
      requestId: expect.any(String),
      timestamp: expect.any(String),
    });
  });
});
