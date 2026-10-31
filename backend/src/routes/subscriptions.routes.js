import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireInternalUser } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import {
  activateSubscription, closeSubscription, confirmSubscription, createSubscription,
  createSubscriptionFromTemplate, deleteSubscription, getSubscription, listSubscriptions,
  pauseSubscription, renewSubscription, resumeSubscription, sendQuotation, updateSubscription,
} from '../controllers/subscriptions.controller.js';
import {
  createSubscriptionSchema, renewBodySchema, subscriptionListQuerySchema,
  templateSubscriptionSchema, transitionParamsSchema, updateSubscriptionSchema,
  templateParamsSchema,
} from '../validators/subscriptions.validators.js';

export const subscriptionsRouter = Router();
subscriptionsRouter.use(authenticate);
subscriptionsRouter.get('/', validate(subscriptionListQuerySchema, 'query'), listSubscriptions);
subscriptionsRouter.post('/', requireInternalUser, validate(createSubscriptionSchema), createSubscription);
subscriptionsRouter.post('/from-template/:templateId', requireInternalUser, validate(templateParamsSchema, 'params'), validate(templateSubscriptionSchema), createSubscriptionFromTemplate);
subscriptionsRouter.get('/:id', validate(transitionParamsSchema, 'params'), getSubscription);
subscriptionsRouter.patch('/:id', requireInternalUser, validate(transitionParamsSchema, 'params'), validate(updateSubscriptionSchema), updateSubscription);
subscriptionsRouter.delete('/:id', requireAdmin, validate(transitionParamsSchema, 'params'), deleteSubscription);
subscriptionsRouter.post('/:id/quotation', requireInternalUser, validate(transitionParamsSchema, 'params'), sendQuotation);
subscriptionsRouter.post('/:id/confirm', requireInternalUser, validate(transitionParamsSchema, 'params'), confirmSubscription);
subscriptionsRouter.post('/:id/activate', requireInternalUser, validate(transitionParamsSchema, 'params'), activateSubscription);
subscriptionsRouter.post('/:id/pause', requireInternalUser, validate(transitionParamsSchema, 'params'), pauseSubscription);
subscriptionsRouter.post('/:id/resume', requireInternalUser, validate(transitionParamsSchema, 'params'), resumeSubscription);
subscriptionsRouter.post('/:id/renew', requireInternalUser, validate(transitionParamsSchema, 'params'), validate(renewBodySchema), renewSubscription);
subscriptionsRouter.post('/:id/close', requireInternalUser, validate(transitionParamsSchema, 'params'), closeSubscription);
