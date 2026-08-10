import type { Request } from 'express';
import type { AccessTokenPayload } from '../application/auth.ports';

export interface AuthenticatedRequest extends Request {
  auth: AccessTokenPayload;
}
