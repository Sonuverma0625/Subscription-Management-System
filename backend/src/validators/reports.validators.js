import { z } from 'zod';

const optionalDate = z.preprocess((value) => value === '' ? undefined : value, z.coerce.date().optional());
export const reportQuerySchema = z.object({
  from: optionalDate,
  to: optionalDate,
  customerId: z.string().max(64).optional(),
  planId: z.string().max(64).optional(),
  status: z.enum(['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const csvQuerySchema = reportQuerySchema.extend({ type: z.enum(['subscriptions', 'invoices', 'payments', 'overdue']).default('invoices') });
