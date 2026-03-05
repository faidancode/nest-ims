import { z } from 'zod';

/** Registered mobile client identifier sent via X-Client-Id header */
export const MOBILE_CLIENT_ID = 'ims-mobile-app-v1';

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(6),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Used by mobile clients that send refreshToken in the request body.
 * Web clients do NOT need to send a body; the token is read from the HttpOnly cookie.
 */
export const RefreshFromBodySchema = z.object({
  refreshToken: z.string({ message: 'refreshToken harus berupa string' }),
});

export type RefreshFromBodyInput = z.infer<typeof RefreshFromBodySchema>;

export const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

