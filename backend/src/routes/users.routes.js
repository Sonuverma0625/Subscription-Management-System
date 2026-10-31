import { Router } from 'express';
import { createStaff, listStaff, setStaffActive } from '../controllers/users.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { staffActiveSchema, staffCreateSchema, staffIdParamsSchema, staffListQuerySchema } from '../validators/users.validators.js';

export const usersRouter = Router();

usersRouter.use(authenticate, requireAdmin);
usersRouter.get('/', validate(staffListQuerySchema, 'query'), listStaff);
usersRouter.post('/', validate(staffCreateSchema), createStaff);
usersRouter.patch('/:id/active', validate(staffIdParamsSchema, 'params'), validate(staffActiveSchema), setStaffActive);
