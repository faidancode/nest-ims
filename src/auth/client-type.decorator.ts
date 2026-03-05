import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { MOBILE_CLIENT_ID } from './auth.schema';

export type ClientType = 'WEB' | 'MOBILE';

/**
 * Decorator that detects the client type based on the X-Client-Id header.
 * Returns 'MOBILE' if the header matches the registered mobile client ID,
 * otherwise returns 'WEB' (default).
 *
 * Usage: @DetectClient() clientType: ClientType
 */
export const DetectClient = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): ClientType => {
        const req = ctx.switchToHttp().getRequest<Request>();
        const clientId = req.headers['x-client-id'];
        return clientId === MOBILE_CLIENT_ID ? 'MOBILE' : 'WEB';
    },
);
