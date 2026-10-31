import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireInternalUser } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { createRazorpayOrder, listInvoicePayments, listPayments, razorpayConfig, recordPayment, reportRazorpayFailure, verifyRazorpayPayment } from '../controllers/payments.controller.js';
import { invoicePaymentParamsSchema, paymentListQuerySchema, paymentSchema, razorpayFailureSchema, razorpayOrderSchema, razorpayVerifySchema } from '../validators/payments.validators.js';
import { requireRoles } from '../middleware/role.js';

export const paymentsRouter = Router();
paymentsRouter.use(authenticate);
paymentsRouter.get('/razorpay/config', requireRoles('CUSTOMER'), razorpayConfig);
paymentsRouter.post('/razorpay/orders', requireRoles('CUSTOMER'), validate(razorpayOrderSchema), createRazorpayOrder);
paymentsRouter.post('/razorpay/verify', requireRoles('CUSTOMER'), validate(razorpayVerifySchema), verifyRazorpayPayment);
paymentsRouter.post('/razorpay/failure', requireRoles('CUSTOMER'), validate(razorpayFailureSchema), reportRazorpayFailure);
paymentsRouter.get('/invoice/:invoiceId', validate(invoicePaymentParamsSchema, 'params'), listInvoicePayments);
paymentsRouter.get('/', validate(paymentListQuerySchema, 'query'), listPayments);
paymentsRouter.post('/', requireInternalUser, validate(paymentSchema), recordPayment);
