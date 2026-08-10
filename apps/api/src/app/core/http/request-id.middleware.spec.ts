import type { NextFunction, Request, Response } from 'express';
import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  it('sets the request id on the request and response', () => {
    const middleware = new RequestIdMiddleware();
    const request = {
      header: jest.fn().mockReturnValue('client-request-123'),
      method: 'GET',
      path: '/api/v1/health',
    } as unknown as Request;
    const on = jest.fn();
    const response = {
      setHeader: jest.fn(),
      on,
      statusCode: 200,
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    middleware.use(request, response, next);

    expect((request as Request & { requestId: string }).requestId).toBe(
      'client-request-123',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      'client-request-123',
    );
    expect(on).toHaveBeenCalledWith('finish', expect.any(Function));
    expect(next).toHaveBeenCalledTimes(1);
  });
});
