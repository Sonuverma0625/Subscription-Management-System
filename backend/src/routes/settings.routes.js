import { Router } from 'express';
import { getCompanySettings, updateCompanySettings } from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { companySettingsSchema } from '../validators/settings.validators.js';

export const settingsRouter = Router();
settingsRouter.use(authenticate, requireAdmin);
settingsRouter.get('/company', getCompanySettings);
settingsRouter.put('/company', validate(companySettingsSchema), updateCompanySettings);
