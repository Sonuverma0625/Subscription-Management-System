import { z } from 'zod';

export const paymentSchema = z.object({
  invoiceId: z.string().min(1).max(64),
  method: z.enum(['CARD', 'BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE']),
  amount: z.coerce.number().positive().max(9999999999),
  paymentDate: z.coerce.date().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});
export const paymentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  invoiceId: z.string().max(64).optional(),
  customerId: z.string().max(64).optional(),
  method: z.enum(['CARD', 'BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE']).optional(),
  search: z.string().trim().max(120).optional(),
});
export const invoicePaymentParamsSchema = z.object({ invoiceId: z.string().min(1).max(64) });
export const razorpayOrderSchema = z.object({ invoiceId: z.string().min(1).max(64) });
export const razorpayVerifySchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});
export const razorpayFailureSchema = z.object({ orderId: z.string().min(1).max(100), reason: z.string().trim().max(500).optional() });
