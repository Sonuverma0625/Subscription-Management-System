import { z } from 'zod';

const optionalDate = z.preprocess((value) => value === '' ? null : value, z.coerce.date().nullable().optional());
const lineSchema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.preprocess((value) => value === '' ? null : value, z.string().max(64).nullable().optional()),
  taxId: z.preprocess((value) => value === '' ? null : value, z.string().max(64).nullable().optional()),
  quantity: z.coerce.number().int().positive().max(100000),
});

export const subscriptionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z.enum(['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED']).optional(),
  customerId: z.string().max(64).optional(),
  planId: z.string().max(64).optional(),
  startDateFrom: optionalDate,
  startDateTo: optionalDate,
  sort: z.enum(['createdAt', 'startDate', 'nextBillingDate', 'expiryDate', 'number']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const subscriptionBaseSchema = z.object({
  customerId: z.string().min(1).max(64),
  planId: z.string().min(1).max(64),
  startDate: z.coerce.date(),
  expiryDate: optionalDate,
  quotationValidUntil: optionalDate,
  paymentTerms: z.string().trim().max(120).nullable().optional(),
  lines: z.array(lineSchema).min(1).max(100),
});
export const createSubscriptionSchema = subscriptionBaseSchema;
export const updateSubscriptionSchema = subscriptionBaseSchema.partial();
export const transitionParamsSchema = z.object({ id: z.string().min(1).max(64) });
export const templateParamsSchema = z.object({ templateId: z.string().min(1).max(64) });
export const renewBodySchema = z.object({ periods: z.coerce.number().int().positive().max(12).default(1) });
export const templateSubscriptionSchema = z.object({
  customerId: z.string().min(1).max(64),
  startDate: z.coerce.date().optional(),
  expiryDate: optionalDate,
  paymentTerms: z.string().trim().max(120).nullable().optional(),
});
