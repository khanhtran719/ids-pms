import {
  BadRequestException,
  ConflictException,
  HttpStatus,
} from '@nestjs/common';
import { normalizeApiError } from './api-error';

describe('normalizeApiError', () => {
  const context = {
    path: '/api/v1/projects',
    requestId: 'request-123',
    timestamp: '2026-08-10T00:00:00.000Z',
  };

  it('normalizes validation messages without exposing framework details', () => {
    expect(
      normalizeApiError(
        new BadRequestException({
          message: ['name must be a string', 'name should not be empty'],
          error: 'Bad Request',
          statusCode: 400,
        }),
        context,
      ),
    ).toEqual({
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: {
        errors: ['name must be a string', 'name should not be empty'],
      },
      ...context,
    });
  });

  it('uses an explicit application error code and message', () => {
    expect(
      normalizeApiError(
        new ConflictException({
          code: 'PROJECT_CODE_EXISTS',
          message: 'Project code already exists',
        }),
        context,
      ),
    ).toEqual({
      statusCode: HttpStatus.CONFLICT,
      code: 'PROJECT_CODE_EXISTS',
      message: 'Project code already exists',
      ...context,
    });
  });

  it('hides unexpected internal error details', () => {
    expect(
      normalizeApiError(new Error('database password leaked'), context),
    ).toEqual({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      ...context,
    });
  });
});
