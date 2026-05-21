import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerClubSchema = z.object({
  clubName: z.string().min(2).max(100),
  clubSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(100),
  adminFirstName: z.string().min(1).max(50),
  adminLastName: z.string().min(1).max(50),
  adminPhone: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(100),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type RegisterClubDto = z.infer<typeof registerClubSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
