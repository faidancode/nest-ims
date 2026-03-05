import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  ChangePasswordSchema,
  LoginSchema,
  RefreshFromBodySchema,
} from './auth.schema';
import type {
  ChangePasswordInput,
  JwtPayload,
  LoginInput,
} from './auth.schema';
import { JwtAuthGuard } from './jwt.guard';
import { ZodValidationPipe } from '../common/http/zod.validation.pipe';
import { ok } from '../common/http/response';
import { DetectClient } from './client-type.decorator';
import type { ClientType } from './client-type.decorator';

const COOKIE_OPTS_BASE = {
  httpOnly: true,
  sameSite: 'lax' as const,
};

function refreshCookieOpts(isProd: boolean) {
  return {
    ...COOKIE_OPTS_BASE,
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // ─── POST /v1/auth/login ────────────────────────────────────────────────────
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginInput,
    @Res({ passthrough: true }) res: Response,
    @DetectClient() clientType: ClientType,
  ) {
    const result = await this.authService.login(dto);
    const isProd = process.env.NODE_ENV === 'production';

    if (clientType === 'MOBILE') {
      // Mobile: return both tokens in JSON body (no cookie needed)
      return ok({
        user: result.user,
        userId: result.userId,
        role: result.role,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    }

    // Web: refreshToken goes to HttpOnly cookie only, NOT in response body
    res.cookie('refreshToken', result.refreshToken, refreshCookieOpts(isProd));

    return ok({
      user: result.user,
      userId: result.userId,
      role: result.role,
      accessToken: result.accessToken,
    });
  }

  // ─── POST /v1/auth/refresh ──────────────────────────────────────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @DetectClient() clientType: ClientType,
    @Body() rawBody: unknown,
  ) {
    const isProd = process.env.NODE_ENV === 'production';

    if (clientType === 'MOBILE') {
      // Mobile: reads refreshToken from request body, returns new tokens in body
      const parsed = RefreshFromBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        throw new BadRequestException({
          status: 'error',
          message: 'refreshToken diperlukan untuk mobile client',
          errors: { refreshToken: 'refreshToken harus ada dan berupa string' },
        });
      }

      const result = await this.authService.refreshAccessToken(parsed.data.refreshToken);

      return ok({
        user: result.user,
        userId: result.userId,
        role: result.role,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken, // return new refreshToken to mobile
      });
    }

    // Web: reads refreshToken from HttpOnly cookie (browser sends it automatically)
    const cookieToken = (req.cookies as Record<string, string>)?.['refreshToken'];
    if (!cookieToken) {
      throw new UnauthorizedException('Sesi telah berakhir, silakan login ulang');
    }

    const result = await this.authService.refreshAccessToken(cookieToken);

    // Rotate the refresh token cookie
    res.cookie('refreshToken', result.refreshToken, refreshCookieOpts(isProd));

    return ok({
      user: result.user,
      userId: result.userId,
      role: result.role,
      accessToken: result.accessToken,
    });
  }

  // ─── POST /v1/auth/logout ───────────────────────────────────────────────────
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    // Clear cookies for web clients (no-op if there's no cookie for mobile)
    res.clearCookie('refreshToken');
    return ok({ message: 'Berhasil logout' });
  }

  // ─── GET /v1/auth/me ────────────────────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: Request & { user: JwtPayload }) {
    const result = await this.authService.getMe(req.user.sub);
    return ok(result);
  }

  // ─── PATCH /v1/auth/me/password ─────────────────────────────────────────────
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
