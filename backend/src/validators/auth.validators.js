import { z } from 'zod';

export const passwordSchema = z.string()
  .min(9, 'Use at least 9 characters.')
  .regex(/[A-Z]/, 'Add at least one uppercase letter.')
  .regex(/[a-z]/, 'Add at least one lowercase letter.')
  .regex(/[^A-Za-z0-9]/, 'Add at least one special character.');

export const registerSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: passwordSchema,
  name: z.string().trim().min(1).max(120).optional(),
  companyName: z.string().trim().max(180).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(200),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export const resetTokenParamsSchema = z.object({
  token: z.string().min(32).max(256),
});
