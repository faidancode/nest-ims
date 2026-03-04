import type { Request } from 'express';
import type { JwtPayload } from 'src/auth/auth.schema';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
