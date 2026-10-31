import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { authRouter } from './routes/auth.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { customersRouter, discountsRouter, plansRouter, productsRouter, taxesRouter, templatesRouter } from './routes/catalog.routes.js';
import { subscriptionsRouter } from './routes/subscriptions.routes.js';
import { invoicesRouter } from './routes/invoices.routes.js';
import { paymentsRouter } from './routes/payments.routes.js';
import { portalRouter } from './routes/portal.routes.js';
import { reportsRouter } from './routes/reports.routes.js';
import { settingsRouter } from './routes/settings.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';
import { auditRouter } from './routes/audit.routes.js';
import { demoRouter } from './routes/demo.routes.js';
import { razorpayWebhook } from './controllers/payments.controller.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  fontSrc: ["'self'", 'https:', 'data:'],
  formAction: ["'self'"],
  frameAncestors: ["'self'"],
  imgSrc: ["'self'", 'data:', 'https://*.razorpay.com'],
  objectSrc: ["'none'"],
  scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
  scriptSrcAttr: ["'none'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
  connectSrc: ["'self'", 'https://*.razorpay.com'],
  frameSrc: ["'self'", 'https://*.razorpay.com'],
} } }));
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.post('/api/v1/payments/razorpay/webhook', express.raw({ type: 'application/json', limit: '1mb' }), razorpayWebhook);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/customers', customersRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/plans', plansRouter);
app.use('/api/v1/taxes', taxesRouter);
app.use('/api/v1/discounts', discountsRouter);
app.use('/api/v1/templates', templatesRouter);
app.use('/api/v1/subscriptions', subscriptionsRouter);
app.use('/api/v1/invoices', invoicesRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/portal', portalRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/audit-logs', auditRouter);
app.use('/api/v1/demo-requests', demoRouter);

app.get('/api/v1/health', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      data: { status: 'ok', database: 'connected' },
      message: `${env.COMPANY_NAME} API is ready.`,
    });
  } catch (error) {
    next(error);
  }
});

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    message: 'Route not found.',
  });
});

app.use((error, _req, res, _next) => {
  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const message = statusCode >= 500 ? 'An unexpected server error occurred.' : error.message;
  if (statusCode >= 500) console.error(error);
  res.status(statusCode).json({ success: false, data: null, message, ...(error.details ? { details: error.details } : {}) });
});
