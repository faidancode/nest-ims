import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { JwtPayload } from './auth.schema';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  const authResult = {
    userId: 'user-1',
    role: 'ADMIN',
    user: {
      name: 'John Doe',
      email: 'john@example.com',
    },
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  beforeEach(async () => {
    const serviceMock: Partial<Record<keyof AuthService, jest.Mock>> = {
      login: jest.fn(),
      refreshAccessToken: jest.fn(),
      getMe: jest.fn(),
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    service = module.get(AuthService) as jest.Mocked<AuthService>;
  });

  describe('login', () => {
    it('returns payload and sets auth cookies', async () => {
      service.login.mockResolvedValue(authResult);
      const res = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.login(
        { email: 'john@example.com', password: 'secret123' },
        res,
      );

      expect(service.login).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'secret123',
      });
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        ok: true,
        data: authResult,
        meta: null,
        error: null,
      });
    });

    it('throws and does not set cookie when login fails', async () => {
      service.login.mockRejectedValue(new UnauthorizedException('Invalid'));
      const res = {
        cookie: jest.fn(),
      } as unknown as Response;

      await expect(
        controller.login({ email: 'john@example.com', password: 'wrong' }, res),
      ).rejects.toThrow(UnauthorizedException);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('clears both auth cookies', async () => {
      const res = {
        clearCookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.logout(res);

      expect(res.clearCookie).toHaveBeenNthCalledWith(1, 'accessToken');
      expect(res.clearCookie).toHaveBeenNthCalledWith(2, 'refreshToken');
      expect(result).toEqual({
        ok: true,
        data: { message: 'Logged out' },
        meta: null,
        error: null,
      });
    });

    it('propagates error when cookie clear fails', async () => {
      const res = {
        clearCookie: jest.fn(() => {
          throw new Error('Failed to clear cookie');
        }),
      } as unknown as Response;

      await expect(controller.logout(res)).rejects.toThrow('Failed to clear cookie');
    });
  });

  describe('refresh', () => {
    it('returns rotated tokens and sets cookies', async () => {
      service.refreshAccessToken.mockResolvedValue(authResult);
      const res = {
        cookie: jest.fn(),
      } as unknown as Response;

      const result = await controller.refresh(
        { refreshToken: 'refresh-token' },
        res,
      );

      expect(service.refreshAccessToken).toHaveBeenCalledWith('refresh-token');
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        ok: true,
        data: authResult,
        meta: null,
        error: null,
      });
    });

    it('throws and does not set cookies when refresh fails', async () => {
      service.refreshAccessToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );
      const res = {
        cookie: jest.fn(),
      } as unknown as Response;

      await expect(
        controller.refresh({ refreshToken: 'bad-token' }, res),
      ).rejects.toThrow(UnauthorizedException);
      expect(res.cookie).not.toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('returns current authenticated user profile', async () => {
      service.getMe.mockResolvedValue({
        userId: 'user-1',
        role: 'ADMIN',
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      });

      const req = {
        user: {
          sub: 'user-1',
          email: 'john@example.com',
          role: 'ADMIN',
        },
      } as Request & { user: JwtPayload };

      const result = await controller.getMe(req);

      expect(service.getMe).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({
        ok: true,
        data: {
          userId: 'user-1',
          role: 'ADMIN',
          user: {
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
        meta: null,
        error: null,
      });
    });

    it('throws when current user profile is not found', async () => {
      service.getMe.mockRejectedValue(new NotFoundException('User not found'));

      const req = {
        user: {
          sub: 'missing',
          email: 'john@example.com',
          role: 'ADMIN',
        },
      } as Request & { user: JwtPayload };

      await expect(controller.getMe(req)).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('changes password for authenticated user', async () => {
      service.changePassword.mockResolvedValue({ success: true });

      const req = {
        user: {
          sub: 'user-1',
          email: 'john@example.com',
          role: 'ADMIN',
        },
      } as Request & { user: JwtPayload };

      const dto = {
        oldPassword: 'secret123',
        newPassword: 'secret456',
      };

      const result = await controller.changePassword(req, dto);

      expect(service.changePassword).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({
        ok: true,
        data: { success: true },
        meta: null,
        error: null,
      });
    });

    it('throws when old password is invalid', async () => {
      service.changePassword.mockRejectedValue(
        new UnauthorizedException('Invalid old password'),
      );

      const req = {
        user: {
          sub: 'user-1',
          email: 'john@example.com',
          role: 'ADMIN',
        },
      } as Request & { user: JwtPayload };

      await expect(
        controller.changePassword(req, {
          oldPassword: 'wrong',
          newPassword: 'secret456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
