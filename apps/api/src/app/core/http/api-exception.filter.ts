import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { normalizeApiError } from './api-error';
import type { RequestWithId } from './request-context';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const error = normalizeApiError(exception, {
      path: request.path,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    });

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        JSON.stringify({
          event: 'unhandled_exception',
          requestId: request.requestId,
          path: request.path,
          exceptionType:
            exception instanceof Error ? exception.name : typeof exception,
        }),
      );
    }

    response.status(error.statusCode).json(error);
  }
}
