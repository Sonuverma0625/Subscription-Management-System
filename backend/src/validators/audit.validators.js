import { z } from 'zod';

const optionalDate = z.preprocess((value) => value === '' ? undefined : value, z.coerce.date().optional());
export const auditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
  entity: z.string().trim().max(60).optional(),
  from: optionalDate,
  to: optionalDate,
});
