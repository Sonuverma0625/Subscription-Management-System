import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../controllers/notifications.controller.js';
import { z } from 'zod';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);
notificationsRouter.get('/', listNotifications);
notificationsRouter.post('/read-all', markAllNotificationsRead);
notificationsRouter.patch('/:id/read', validate(z.object({ id: z.string().min(1).max(64) }), 'params'), markNotificationRead);
