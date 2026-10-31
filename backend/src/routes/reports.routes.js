import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireInternalUser } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { exportReportCsv, reportActiveSubscriptions, reportOverdue, reportPayments, reportRevenue, reportSummary } from '../controllers/reports.controller.js';
import { csvQuerySchema, reportQuerySchema } from '../validators/reports.validators.js';

export const reportsRouter = Router();
reportsRouter.use(authenticate, requireInternalUser);
reportsRouter.get('/summary', validate(reportQuerySchema, 'query'), reportSummary);
reportsRouter.get('/revenue', validate(reportQuerySchema, 'query'), reportRevenue);
reportsRouter.get('/overdue', validate(reportQuerySchema, 'query'), reportOverdue);
reportsRouter.get('/active-subscriptions', validate(reportQuerySchema, 'query'), reportActiveSubscriptions);
reportsRouter.get('/payments', validate(reportQuerySchema, 'query'), reportPayments);
reportsRouter.get('/export.csv', validate(csvQuerySchema, 'query'), exportReportCsv);
