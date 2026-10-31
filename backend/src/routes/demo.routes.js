import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createDemoRequest, listDemoRequests, updateDemoRequestStatus } from '../controllers/demo.controller.js';
import { validate } from '../middleware/validate.js';
import { demoListQuerySchema, demoRequestSchema, demoStatusBodySchema, demoStatusSchema } from '../validators/demo.validators.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';

export const demoRouter = Router();
demoRouter.post('/', rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false }), validate(demoRequestSchema), createDemoRequest);
demoRouter.get('/', authenticate, requireAdmin, validate(demoListQuerySchema, 'query'), listDemoRequests);
demoRouter.patch('/:id/status', authenticate, requireAdmin, validate(demoStatusSchema, 'params'), validate(demoStatusBodySchema), updateDemoRequestStatus);
