import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireInternalUser } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { cancelInvoice, confirmInvoice, downloadInvoicePdf, generateInvoiceNow, getInvoice, listInvoices, runBillingNow, sendInvoice } from '../controllers/invoices.controller.js';
import { invoiceIdParamsSchema, invoiceListQuerySchema } from '../validators/invoices.validators.js';

export const invoicesRouter = Router();
invoicesRouter.use(authenticate);
invoicesRouter.get('/', validate(invoiceListQuerySchema, 'query'), listInvoices);
invoicesRouter.post('/generate/:subscriptionId', requireInternalUser, generateInvoiceNow);
invoicesRouter.post('/run-billing', requireAdmin, runBillingNow);
invoicesRouter.get('/:id/pdf', validate(invoiceIdParamsSchema, 'params'), downloadInvoicePdf);
invoicesRouter.post('/:id/send', requireInternalUser, validate(invoiceIdParamsSchema, 'params'), sendInvoice);
invoicesRouter.get('/:id', validate(invoiceIdParamsSchema, 'params'), getInvoice);
invoicesRouter.post('/:id/confirm', requireInternalUser, validate(invoiceIdParamsSchema, 'params'), confirmInvoice);
invoicesRouter.post('/:id/cancel', requireInternalUser, validate(invoiceIdParamsSchema, 'params'), cancelInvoice);
