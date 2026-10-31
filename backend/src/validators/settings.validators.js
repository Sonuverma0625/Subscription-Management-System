import { z } from 'zod';

export const companySettingsSchema = z.object({
  companyName: z.string().trim().min(1).max(160),
  companyEmail: z.string().trim().email().max(254),
  companyAddress: z.string().trim().max(1000).nullable().optional(),
});
