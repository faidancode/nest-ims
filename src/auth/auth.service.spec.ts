import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Pick<Repository<User>, 'findOne' | 'save'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'signAsync' | 'verifyAsync'>>;
  let configService: { get: jest.Mock };

  const mockedCompare = bcrypt.compare as jest.MockedFunction<
    typeof bcrypt.compare
  >;
  const mockedHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;

  const mockUser: User = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed-password',
    roleId: 'role-1',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null as any,
  };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string, defaultValue?: any, options?: any) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return values[key] ?? defaultValue ?? 'fallback';
      }),
    };

    mockedCompare.mockReset();
    mockedHash.mockReset();
    jwtService.signAsync.mockReset();
    jwtService.verifyAsync.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('returns user when email and password are valid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(true);

      const result = await service.validateUser(
        'john@example.com',
        'secret123',
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(mockedCompare).toHaveBeenCalledWith(
        'secret123',
        'hashed-password',
      );
      expect(result).toEqual(mockUser);
    });

    it('throws unauthorized when user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateUser('missing@example.com', 'secret123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws unauthorized when user is inactive', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.validateUser('john@example.com', 'secret123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws unauthorized when password is invalid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      mockedCompare.mockResolvedValue(false);

      await expect(
        service.validateUser('john@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('signAccessToken', () => {
    it('signs an access token using access secret and expiry', async () => {
      jwtService.signAsync.mockResolvedValue('access-token');

      const result = await service.signAccessToken(mockUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: 'user-1',
          email: 'john@example.com',
          role: 'role-1',
        },
        {
          secret: 'access-secret',
          expiresIn: '15m',
        },
      );
      expect(result).toBe('access-token');
    });

    it('throws when jwt signing fails for access token', async () => {
      jwtService.signAsync.mockRejectedValue(new Error('jwt failed'));

      await expect(service.signAccessToken(mockUser)).rejects.toThrow(
        'jwt failed',
      );
    });
  });

  describe('signRefreshToken', () => {
    it('signs a refresh token using refresh secret and expiry', async () => {
      jwtService.signAsync.mockResolvedValue('refresh-token');

      const result = await service.signRefreshToken(mockUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 'user-1' },
        {
          secret: 'refresh-secret',
          expiresIn: '7d',
        },
      );
      expect(result).toBe('refresh-token');
    });

    it('throws when jwt signing fails for refresh token', async () => {
      jwtService.signAsync.mockRejectedValue(new Error('jwt failed'));

      await expect(service.signRefreshToken(mockUser)).rejects.toThrow(
        'jwt failed',
      );
    });
  });

  describe('login', () => {
    it('returns tokens and user profile when credentials are valid', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser);
      jest.spyOn(service, 'signAccessToken').mockResolvedValue('access-token');
      jest
        .spyOn(service, 'signRefreshToken')
        .mockResolvedValue('refresh-token');

      const result = await service.login({
        email: 'john@example.com',
        password: 'secret123',
      });

      expect(service.validateUser).toHaveBeenCalledWith(
        'john@example.com',
        'secret123',
      );
      expect(result).toEqual({
        userId: 'user-1',
        role: 'role-1',
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('throws when credentials are invalid', async () => {
      jest
        .spyOn(service, 'validateUser')
        .mockRejectedValue(new UnauthorizedException('Invalid credentials'));
      const signAccessSpy = jest.spyOn(service, 'signAccessToken');
      const signRefreshSpy = jest.spyOn(service, 'signRefreshToken');

      await expect(
        service.login({ email: 'john@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(signAccessSpy).not.toHaveBeenCalled();
      expect(signRefreshSpy).not.toHaveBeenCalled();
    });
  });

  describe('refreshAccessToken', () => {
    it('returns rotated tokens for valid refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      userRepository.findOne.mockResolvedValue(mockUser);
      jest
        .spyOn(service, 'signAccessToken')
        .mockResolvedValue('new-access-token');
      jest
        .spyOn(service, 'signRefreshToken')
        .mockResolvedValue('new-refresh-token');

      const result = await service.refreshAccessToken('valid-refresh-token');

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'valid-refresh-token',
        {
          secret: 'refresh-secret',
        },
      );
      expect(result).toEqual({
        userId: 'user-1',
        role: 'role-1',
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('throws unauthorized when refresh token is invalid', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(service.refreshAccessToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws unauthorized when user is missing or inactive', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.refreshAccessToken('valid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMe', () => {
    it('returns profile data for existing user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getMe('user-1');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(result).toEqual({
        userId: 'user-1',
        role: 'role-1',
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      });
    });

    it('throws not found when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getMe('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('changePassword', () => {
    it('updates password when old password is valid', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser });
      mockedCompare.mockResolvedValue(true);
      mockedHash.mockResolvedValue('new-hashed-password' as never);

      const result = await service.changePassword('user-1', {
        oldPassword: 'secret123',
        newPassword: 'secret456',
      });

      expect(mockedCompare).toHaveBeenCalledWith(
        'secret123',
        'hashed-password',
      );
      expect(mockedHash).toHaveBeenCalledWith('secret456', 10);
      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          password: 'new-hashed-password',
        }),
      );
      expect(result).toEqual({ success: true });
    });

    it('throws not found when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword('missing', {
          oldPassword: 'secret123',
          newPassword: 'secret456',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws unauthorized when old password is invalid', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser });
      mockedCompare.mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', {
          oldPassword: 'wrong-old-password',
          newPassword: 'secret456',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });
});

