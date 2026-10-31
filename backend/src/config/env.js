import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CRON_SECRET: z.preprocess((value) => value === '' ? undefined : value, z.string().min(32, 'CRON_SECRET must contain at least 32 characters').optional()),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must contain at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must contain at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().regex(/^\d+[smhd]$/, 'ACCESS_TOKEN_TTL must use s, m, h, or d units').default('15m'),
  REFRESH_TOKEN_TTL: z.string().regex(/^\d+[smhd]$/, 'REFRESH_TOKEN_TTL must use s, m, h, or d units').default('7d'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  COMPANY_NAME: z.string().default('Darkside'),
  COMPANY_EMAIL: z.string().email().default('billing@brightloop.com'),
  COMPANY_ADDRESS: z.string().default(''),
  MAIL_HOST: z.string().default('localhost'),
  MAIL_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_SECURE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  MAIL_USER: z.string().default(''),
  MAIL_PASSWORD: z.string().default(''),
  MAIL_FROM: z.string().default('Darkside <billing@brightloop.com>'),
  OVERDUE_EMAILS: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  PASSWORD_RESET_URL: z.string().url().default('http://localhost:5173/reset-password'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  RAZORPAY_KEY_ID: z.string().default(''),
  RAZORPAY_KEY_SECRET: z.string().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map(({ path, message }) => `${path.join('.')}: ${message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = parsed.data;
