import { z } from 'zod';

const optionalDate = z.preprocess((value) => value === '' ? null : value, z.coerce.date().nullable().optional());
const optionalText = z.preprocess((value) => value === '' ? null : value, z.string().trim().max(2000).nullable().optional());
const idParams = z.object({ id: z.string().min(1).max(64) });

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  status: z.string().trim().max(32).optional(),
  customerId: z.string().max(64).optional(),
  planId: z.string().max(64).optional(),
  sort: z.enum(['createdAt', 'name', 'startDate', 'nextBillingDate', 'dueDate', 'issueDate']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamsSchema = idParams;

export const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.enum(['SERVICE', 'SOFTWARE', 'HARDWARE', 'OTHER']).default('SERVICE'),
  salesPrice: z.coerce.number().min(0).max(9999999999),
  costPrice: z.coerce.number().min(0).max(9999999999),
  notes: optionalText,
  isActive: z.boolean().optional(),
});
export const productUpdateSchema = productSchema.partial();

export const variantSchema = z.object({
  attribute: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(120),
  extraPrice: z.coerce.number().min(0).max(9999999999).default(0),
});
export const variantParamsSchema = z.object({ id: z.string().min(1).max(64), variantId: z.string().min(1).max(64) });

const planBaseSchema = z.object({
  name: z.string().trim().min(1).max(160),
  price: z.coerce.number().min(0).max(9999999999),
  billingPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  minQuantity: z.coerce.number().int().min(1).max(100000).default(1),
  startDate: optionalDate,
  endDate: optionalDate,
  autoClose: z.boolean().default(false),
  allowCloseEarly: z.boolean().default(true),
  allowPause: z.boolean().default(true),
  allowRenew: z.boolean().default(true),
  isActive: z.boolean().optional(),
});
const validPlanDates = (value) => !value.startDate || !value.endDate || value.endDate >= value.startDate;
export const planSchema = planBaseSchema.refine(validPlanDates, { path: ['endDate'], message: 'End date must be on or after the available-from date.' });
export const planUpdateSchema = planBaseSchema.partial().refine(validPlanDates, { path: ['endDate'], message: 'End date must be on or after the available-from date.' });

const taxBaseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  ratePercent: z.coerce.number().min(0).max(100),
  isActive: z.boolean().optional(),
  productId: z.preprocess((value) => value === '' ? null : value, z.string().max(64).nullable().optional()),
  productType: z.preprocess((value) => value === '' ? null : value, z.enum(['SERVICE', 'SOFTWARE', 'HARDWARE', 'OTHER']).nullable().optional()),
});
const validTaxTarget = (value) => !(value.productId && value.productType);
export const taxSchema = taxBaseSchema.refine(validTaxTarget, { message: 'Choose either one product or one product type for a tax rule.' });
export const taxUpdateSchema = taxBaseSchema.partial().refine(validTaxTarget, { message: 'Choose either one product or one product type for a tax rule.' });

const discountBaseSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.enum(['FIXED', 'PERCENTAGE']),
  value: z.coerce.number().positive().max(9999999999),
  minPurchase: z.preprocess((value) => value === '' || value === null ? null : value, z.coerce.number().nonnegative().nullable().optional()),
  minQuantity: z.coerce.number().int().min(1).max(100000).default(1),
  startDate: optionalDate,
  endDate: optionalDate,
  usageLimit: z.preprocess((value) => value === '' || value === null ? null : value, z.coerce.number().int().positive().nullable().optional()),
  appliesTo: z.enum(['PRODUCT', 'SUBSCRIPTION']),
  productId: z.preprocess((value) => value === '' ? null : value, z.string().max(64).nullable().optional()),
  isActive: z.boolean().optional(),
});
const validDiscount = (value) => (value.type !== 'PERCENTAGE' || value.value <= 100)
  && (value.appliesTo !== 'PRODUCT' || Boolean(value.productId))
  && (value.appliesTo !== 'SUBSCRIPTION' || !value.productId)
  && (!value.startDate || !value.endDate || value.endDate >= value.startDate);
export const discountSchema = discountBaseSchema.refine(validDiscount, { message: 'Discount configuration is invalid.' });
export const discountUpdateSchema = discountBaseSchema.partial();

const templateLineSchema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.preprocess((value) => value === '' ? null : value, z.string().max(64).nullable().optional()),
  quantity: z.coerce.number().int().positive().max(100000),
});
export const templateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  validityDays: z.coerce.number().int().positive().max(365),
  planId: z.string().min(1).max(64),
  lines: z.array(templateLineSchema).min(1).max(100),
});
export const templateUpdateSchema = templateSchema.partial();

export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
});
