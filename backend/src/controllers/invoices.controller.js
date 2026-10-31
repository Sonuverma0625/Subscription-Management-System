import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAuditLog } from '../utils/audit.js';
import { generateInvoicesForSubscription, runDueBilling } from '../services/billing.service.js';
import { createInvoicePdf } from '../services/pdf.service.js';
import { sendInvoiceEmail } from '../config/mailer.js';

const invoiceInclude = {
  customer: { include: { user: { select: { id: true, name: true, email: true } } } },
  subscription: { include: { plan: true } },
  lines: { orderBy: { id: 'asc' } },
  payments: { orderBy: { paymentDate: 'desc' } },
};

function makeWhere(query, user) {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.subscriptionId ? { subscriptionId: query.subscriptionId } : {}),
    ...(query.customerId && user.role !== 'CUSTOMER' ? { customerId: query.customerId } : {}),
    ...(user.role === 'CUSTOMER' ? { customerId: user.customer?.id || '__no-customer__' } : {}),
  };
  if (query.search) where.OR = [
    { number: { contains: query.search, mode: 'insensitive' } },
    { customer: { companyName: { contains: query.search, mode: 'insensitive' } } },
    { customer: { user: { email: { contains: query.search, mode: 'insensitive' } } } },
    { subscription: { number: { contains: query.search, mode: 'insensitive' } } },
  ];
  return where;
}

export const listInvoices = asyncHandler(async (req, res) => {
  const { page, limit, sort, order, ...filters } = req.validatedQuery;
  const where = makeWhere(filters, req.user);
  const [items, total] = await prisma.$transaction([
    prisma.invoice.findMany({ where, include: invoiceInclude, orderBy: { [sort]: order }, skip: (page - 1) * limit, take: limit }),
    prisma.invoice.count({ where }),
  ]);
  return res.status(200).json({ success: true, data: items, message: 'Invoices loaded.', meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: invoiceInclude });
  if (!invoice || (req.user.role === 'CUSTOMER' && invoice.customerId !== req.user.customer?.id)) throw new ApiError(404, 'Invoice not found.');
  return res.status(200).json({ success: true, data: { invoice }, message: 'Invoice loaded.' });
});

export const downloadInvoicePdf = asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: invoiceInclude });
  if (!invoice || (req.user.role === 'CUSTOMER' && invoice.customerId !== req.user.customer?.id)) throw new ApiError(404, 'Invoice not found.');
  const pdf = await createInvoicePdf(invoice);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${invoice.number}.pdf"`);
  res.setHeader('Content-Length', pdf.length);
  return res.status(200).send(pdf);
});

export const sendInvoice = asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: invoiceInclude });
  if (!invoice) throw new ApiError(404, 'Invoice not found.');
  if (!['CONFIRMED', 'PAID'].includes(invoice.status)) throw new ApiError(409, 'Confirm the invoice before sending it.');
  const pdf = await createInvoicePdf(invoice);
  try {
    await sendInvoiceEmail({ to: invoice.customer.user.email, customerName: invoice.customer.user.name, invoice, pdf });
  } catch (error) {
    console.error('Invoice email delivery failed:', error.message);
    throw new ApiError(502, 'Invoice email could not be sent. Check the SMTP settings and try again.');
  }
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.invoice.update({ where: { id: invoice.id }, data: { sentAt: new Date() }, include: invoiceInclude });
    await writeAuditLog(tx, { userId: req.user.id, action: 'INVOICE_SENT', entity: 'Invoice', entityId: result.id });
    return result;
  });
  return res.status(200).json({ success: true, data: { invoice: updated }, message: `Invoice sent to ${invoice.customer.user.email}.` });
});

export const generateInvoiceNow = asyncHandler(async (req, res) => {
  const result = await generateInvoicesForSubscription(req.params.subscriptionId, { actorId: req.user.id, forceOne: true });
  const invoice = result.created[0] || result.skipped[0];
  if (!invoice) throw new ApiError(409, 'No billable period remains before this subscription expires.');
  return res.status(result.created.length ? 201 : 200).json({ success: true, data: { invoice, created: result.created.length === 1, skipped: result.skipped.length === 1 }, message: result.created.length ? 'Invoice generated.' : 'This billing period already has an invoice.' });
});

export const runBillingNow = asyncHandler(async (req, res) => {
  const summary = await runDueBilling({ actorId: req.user.id });
  return res.status(200).json({ success: true, data: summary, message: `Billing finished: ${summary.created} created, ${summary.skipped} skipped, ${summary.failed} failed.` });
});

export const confirmInvoice = asyncHandler(async (req, res) => {
  const current = await prisma.invoice.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } });
  if (!current) throw new ApiError(404, 'Invoice not found.');
  if (current.status !== 'DRAFT') throw new ApiError(409, 'Only draft invoices can be confirmed.');
  const invoice = await prisma.$transaction(async (tx) => {
    const result = await tx.invoice.update({ where: { id: current.id }, data: { status: 'CONFIRMED' }, include: invoiceInclude });
    await writeAuditLog(tx, { userId: req.user.id, action: 'INVOICE_CONFIRMED', entity: 'Invoice', entityId: result.id });
    return result;
  });
  return res.status(200).json({ success: true, data: { invoice }, message: 'Invoice confirmed.' });
});

export const cancelInvoice = asyncHandler(async (req, res) => {
  const current = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { payments: { select: { id: true } } } });
  if (!current) throw new ApiError(404, 'Invoice not found.');
  if (!['DRAFT', 'CONFIRMED'].includes(current.status)) throw new ApiError(409, 'Only draft or confirmed invoices can be cancelled.');
  if (Number(current.amountPaid) > 0 || current.payments.length) throw new ApiError(409, 'An invoice with recorded payments cannot be cancelled.');
  const invoice = await prisma.$transaction(async (tx) => {
    const result = await tx.invoice.update({ where: { id: current.id }, data: { status: 'CANCELLED' }, include: invoiceInclude });
    await writeAuditLog(tx, { userId: req.user.id, action: 'INVOICE_CANCELLED', entity: 'Invoice', entityId: result.id });
    return result;
  });
  return res.status(200).json({ success: true, data: { invoice }, message: 'Invoice cancelled.' });
});
