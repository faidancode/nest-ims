import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  LoginSchema,
  RefreshTokenSchema,
  ChangePasswordSchema,
  JwtPayload,
} from './auth.schema';

import type {
  LoginInput,
  RefreshTokenInput,
  ChangePasswordInput,
} from './auth.schema';

import { JwtAuthGuard } from './jwt.guard';
import { ZodValidationPipe } from '../common/http/zod.validation.pipe';
import { ok } from '../common/http/response';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    // Set tokens in cookies for web clients
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ok(result);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return ok({ message: 'Logged out' });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(new ZodValidationPipe(RefreshTokenSchema)) dto: RefreshTokenInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refreshAccessToken(dto.refreshToken);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return ok(result);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: Request & { user: JwtPayload }) {
    const result = await this.authService.getMe(req.user.sub);
    return ok(result);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() req: Request & { user: JwtPayload },
    @Body(new ZodValidationPipe(ChangePasswordSchema)) dto: ChangePasswordInput,
  ) {
    const result = await this.authService.changePassword(req.user.sub, dto);
    return ok(result);
  }
}
