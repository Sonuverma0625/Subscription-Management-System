import { z } from 'zod';
import { passwordSchema } from './auth.validators.js';

export const staffCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: passwordSchema,
});

export const staffListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
});

export const staffIdParamsSchema = z.object({ id: z.string().min(1).max(64) });

export const staffActiveSchema = z.object({ isActive: z.boolean() });
