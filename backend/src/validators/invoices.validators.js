import { z } from 'zod';

export const invoiceListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED']).optional(),
  customerId: z.string().max(64).optional(),
  subscriptionId: z.string().max(64).optional(),
  sort: z.enum(['createdAt', 'issueDate', 'dueDate', 'number', 'total']).default('issueDate'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export const invoiceIdParamsSchema = z.object({ id: z.string().min(1).max(64) });
