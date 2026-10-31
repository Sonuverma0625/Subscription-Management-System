import { z } from 'zod';

export const demoRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  companyName: z.string().trim().min(2).max(120),
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(200).optional().default(''),
});
export const demoListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED']).optional(),
});
export const demoStatusSchema = z.object({ id: z.string().min(1).max(64) });
export const demoStatusBodySchema = z.object({ status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED']) });
