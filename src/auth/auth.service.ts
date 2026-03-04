import {
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  ChangePasswordInput,
  JwtPayload,
  LoginInput
} from './auth.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        code: 'USER_INACTIVE',
        message: 'User is inactive',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    return user;
  }

  async login(dto: LoginInput) {
    const user = await this.validateUser(dto.email, dto.password);

    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.signRefreshToken(user);

    return {
      userId: user.id,
      role: user.role,
      user: {
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  }

  async signAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.signAsync(payload as any, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as any,
    });
  }

  async signRefreshToken(user: User): Promise<string> {
    return this.jwtService.signAsync(
      { sub: user.id } as any,
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ) as any,
      },
    );
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = await this.signAccessToken(user);
      const newRefreshToken = await this.signRefreshToken(user);

      return {
        userId: user.id,
        role: user.role,
        user: {
          name: user.name,
          email: user.email,
        },
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      userId: user.id,
      role: user.role,
      user: {
        name: user.name,
        email: user.email,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordInput) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(
      dto.oldPassword,
      user.password,
    );
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Invalid old password');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    return { success: true };
  }
}
