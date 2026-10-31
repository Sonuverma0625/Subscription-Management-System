import { Router } from 'express';
import { listAuditLogs } from '../controllers/audit.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { auditQuerySchema } from '../validators/audit.validators.js';

export const auditRouter = Router();
auditRouter.use(authenticate, requireAdmin);
auditRouter.get('/', validate(auditQuerySchema, 'query'), listAuditLogs);
