import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { JwtPayload } from './auth.schema';
import { MOBILE_CLIENT_ID } from './auth.schema';
import { JwtAuthGuard } from './jwt.guard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeRes = () =>
  ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  }) as unknown as Response;

const makeReq = (overrides: Partial<Request & { user: JwtPayload; cookies: Record<string, string> }> = {}) =>
  ({ cookies: {}, ...overrides }) as unknown as Request & { user: JwtPayload };

const webHeaders = {}; // no X-Client-Id → WEB
const mobileHeaders = { 'x-client-id': MOBILE_CLIENT_ID };

// ─── Auth result fixture ──────────────────────────────────────────────────────

const authResult = {
  userId: 'user-1',
  role: 'ADMIN',
  user: { name: 'John Doe', email: 'john@example.com' },
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

// Helper that maps raw request through the DetectClient decorator manually.
// In unit tests the decorator isn't invoked by NestJS DI, so we call the
// controller methods directly, passing `clientType` as the parameter that the
// decorator would produce.
describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const serviceMock: Partial<Record<keyof AuthService, jest.Mock>> = {
      login: jest.fn(),
      refreshAccessToken: jest.fn(),
      getMe: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: serviceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
    service = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  // ─── login ──────────────────────────────────────────────────────────────────

  describe('login (WEB)', () => {
    it('returns accessToken in body and sets refreshToken cookie', async () => {
      service.login.mockResolvedValue(authResult);
      const res = makeRes();

      const result = await controller.login(
        { email: 'john@example.com', password: 'secret123' },
        res,
        'WEB',
      );

      expect(service.login).toHaveBeenCalled();
      expect(res.cookie).toHaveBeenCalledTimes(1);
      expect((res.cookie as jest.Mock).mock.calls[0][0]).toBe('refreshToken');
      expect(result.data).toEqual(
        expect.objectContaining({ accessToken: 'access-token' }),
      );
      expect((result.data as Record<string, unknown>)['refreshToken']).toBeUndefined();
    });

    it('throws and does not set cookie when login fails', async () => {
      service.login.mockRejectedValue(new UnauthorizedException());
      const res = makeRes();

      await expect(
        controller.login({ email: 'john@example.com', password: 'wrong' }, res, 'WEB'),
      ).rejects.toThrow(UnauthorizedException);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('login (MOBILE)', () => {
    it('returns both tokens in body and does NOT set cookie', async () => {
      service.login.mockResolvedValue(authResult);
      const res = makeRes();

      const result = await controller.login(
        { email: 'john@example.com', password: 'secret123' },
        res,
        'MOBILE',
      );

      expect(res.cookie).not.toHaveBeenCalled();
      expect((result.data as Record<string, unknown>)['accessToken']).toBe('access-token');
      expect((result.data as Record<string, unknown>)['refreshToken']).toBe('refresh-token');
    });
  });

  // ─── refresh ─────────────────────────────────────────────────────────────────

  describe('refresh (WEB)', () => {
    it('reads refreshToken from cookie and rotates it', async () => {
      service.refreshAccessToken.mockResolvedValue(authResult);
      const req = makeReq({ cookies: { refreshToken: 'cookie-refresh-token' } });
      const res = makeRes();

      const result = await controller.refresh(req, res, 'WEB', {});

      expect(service.refreshAccessToken).toHaveBeenCalledWith('cookie-refresh-token');
      expect(res.cookie).toHaveBeenCalledTimes(1);
      expect((res.cookie as jest.Mock).mock.calls[0][0]).toBe('refreshToken');
      expect((result.data as Record<string, unknown>)['refreshToken']).toBeUndefined();
    });

    it('throws 401 when no refresh cookie is present', async () => {
      const req = makeReq({ cookies: {} });
      const res = makeRes();

      await expect(
        controller.refresh(req, res, 'WEB', {}),
      ).rejects.toThrow(UnauthorizedException);
      expect(service.refreshAccessToken).not.toHaveBeenCalled();
    });

    it('throws when refresh token is invalid', async () => {
      service.refreshAccessToken.mockRejectedValue(new UnauthorizedException('Invalid'));
      const req = makeReq({ cookies: { refreshToken: 'bad-token' } });
      const res = makeRes();

      await expect(
        controller.refresh(req, res, 'WEB', {}),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh (MOBILE)', () => {
    it('reads refreshToken from body and returns new tokens in body', async () => {
      service.refreshAccessToken.mockResolvedValue(authResult);
      const req = makeReq();
      const res = makeRes();

      const result = await controller.refresh(
        req,
        res,
        'MOBILE',
        { refreshToken: 'mobile-refresh-token' },
      );

      expect(service.refreshAccessToken).toHaveBeenCalledWith('mobile-refresh-token');
      expect(res.cookie).not.toHaveBeenCalled();
      expect((result.data as Record<string, unknown>)['accessToken']).toBe('access-token');
      expect((result.data as Record<string, unknown>)['refreshToken']).toBe('refresh-token');
    });

    it('throws 400 if refreshToken is missing from body', async () => {
      const req = makeReq();
      const res = makeRes();

      await expect(
        controller.refresh(req, res, 'MOBILE', {}),
      ).rejects.toThrow(BadRequestException);
      expect(service.refreshAccessToken).not.toHaveBeenCalled();
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('clears refreshToken cookie and returns success', async () => {
      const res = makeRes();

      const result = await controller.logout(res);

      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(result).toEqual(
        expect.objectContaining({ ok: true }),
      );
    });

    it('propagates error when clearCookie throws', async () => {
      const res = {
        clearCookie: jest.fn(() => { throw new Error('Failed'); }),
      } as unknown as Response;

      await expect(controller.logout(res)).rejects.toThrow('Failed');
    });
  });

  // ─── getMe ───────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('returns current authenticated user profile', async () => {
      service.getMe.mockResolvedValue({
        userId: 'user-1',
        role: 'ADMIN',
        user: { name: 'John Doe', email: 'john@example.com' },
      });

      const req = makeReq({
        user: { sub: 'user-1', email: 'john@example.com', role: 'ADMIN' },
      });

      const result = await controller.getMe(req as Request & { user: JwtPayload });

      expect(service.getMe).toHaveBeenCalledWith('user-1');
      expect(result.ok).toBe(true);
    });

    it('throws NotFoundException when user not found', async () => {
      service.getMe.mockRejectedValue(new NotFoundException('User not found'));

      const req = makeReq({ user: { sub: 'missing', email: '', role: '' } });
      await expect(controller.getMe(req as Request & { user: JwtPayload })).rejects.toThrow(NotFoundException);
    });
  });

  // ─── changePassword ───────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('changes password for authenticated user', async () => {
      service.changePassword.mockResolvedValue({ success: true });

      const req = makeReq({ user: { sub: 'user-1', email: 'john@example.com', role: 'ADMIN' } });
      const dto = { oldPassword: 'secret123', newPassword: 'secret456' };

      const result = await controller.changePassword(req as Request & { user: JwtPayload }, dto);

      expect(service.changePassword).toHaveBeenCalledWith('user-1', dto);
      expect(result.ok).toBe(true);
    });

    it('throws when old password is invalid', async () => {
      service.changePassword.mockRejectedValue(new UnauthorizedException('Invalid old password'));

      const req = makeReq({ user: { sub: 'user-1', email: '', role: '' } });
      await expect(
        controller.changePassword(req as Request & { user: JwtPayload }, {
          oldPassword: 'wrong',
          newPassword: 'newpass',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
