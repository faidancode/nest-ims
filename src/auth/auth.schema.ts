import { z } from 'zod';

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

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

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
