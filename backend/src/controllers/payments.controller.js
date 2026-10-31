import { Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { sendPaymentReceiptEmail } from '../config/mailer.js';
import { createInvoicePdf } from '../services/pdf.service.js';
import { isRazorpayConfigured, razorpayRequest, verifyHmac } from '../services/razorpay.service.js';
import { createNotification } from '../services/notification.service.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAuditLog } from '../utils/audit.js';

const paymentInclude = {
  invoice: { select: { id: true, number: true, customerId: true, total: true, amountPaid: true, status: true, dueDate: true, customer: { select: { companyName: true, user: { select: { id: true, name: true, email: true } } } } } },
  recorder: { select: { id: true, name: true, email: true } },
};

function paymentWhere(query, user) {
  return {
    ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
    ...(query.method ? { method: query.method } : {}),
    ...(query.customerId && user.role !== 'CUSTOMER' ? { invoice: { customerId: query.customerId } } : {}),
    ...(user.role === 'CUSTOMER' ? { invoice: { customerId: user.customer?.id || '__no-customer__' } } : {}),
    ...(query.search ? { OR: [
      { invoice: { number: { contains: query.search, mode: 'insensitive' } } },
      { note: { contains: query.search, mode: 'insensitive' } },
    ] } : {}),
  };
}

async function sendReceipt(payment, customerName, email) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: payment.invoiceId },
      include: { customer: { include: { user: true } }, subscription: { include: { plan: true } }, lines: { orderBy: { id: 'asc' } }, payments: { orderBy: { paymentDate: 'desc' } } },
    });
    if (!invoice) return;
    const pdf = await createInvoicePdf(invoice);
    await sendPaymentReceiptEmail({ to: email, customerName, invoice, payment, pdf });
  } catch (error) {
    console.warn(`[payments] Payment saved; receipt email failed for ${payment.invoice.number}:`, error.message);
  }
}

export const listPayments = asyncHandler(async (req, res) => {
  const { page, limit, ...filters } = req.validatedQuery;
  const where = paymentWhere(filters, req.user);
  const [items, total] = await prisma.$transaction([
    prisma.payment.findMany({ where, include: paymentInclude, orderBy: { paymentDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.payment.count({ where }),
  ]);
  return res.status(200).json({ success: true, data: items, message: 'Payments loaded.', meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const listInvoicePayments = asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.invoiceId }, select: { id: true, customerId: true } });
  if (!invoice || (req.user.role === 'CUSTOMER' && invoice.customerId !== req.user.customer?.id)) throw new ApiError(404, 'Invoice not found.');
  const items = await prisma.payment.findMany({ where: { invoiceId: invoice.id }, include: paymentInclude, orderBy: { paymentDate: 'desc' } });
  return res.status(200).json({ success: true, data: items, message: 'Invoice payments loaded.', meta: { total: items.length } });
});

export const recordPayment = asyncHandler(async (req, res) => {
  const amount = new Prisma.Decimal(req.body.amount.toFixed(2));
  const payment = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: req.body.invoiceId }, select: { id: true, number: true, total: true, amountPaid: true, status: true } });
    if (!invoice) throw new ApiError(404, 'Invoice not found.');
    if (invoice.status !== 'CONFIRMED') throw new ApiError(409, 'Payments can only be recorded against confirmed invoices.');
    const total = new Prisma.Decimal(invoice.total.toString());
    const paidBefore = new Prisma.Decimal(invoice.amountPaid.toString());
    if (amount.greaterThan(total.minus(paidBefore))) throw new ApiError(409, 'Payment exceeds the invoice’s outstanding balance.');
    const paidAfter = paidBefore.plus(amount);
    const update = await tx.invoice.updateMany({
      where: { id: invoice.id, status: 'CONFIRMED', amountPaid: { lte: total.minus(amount) } },
      data: { amountPaid: { increment: amount }, ...(paidAfter.greaterThanOrEqualTo(total) ? { status: 'PAID' } : {}) },
    });
    if (update.count !== 1) throw new ApiError(409, 'The invoice balance changed. Reload it and try again.');
    const created = await tx.payment.create({ data: {
      invoiceId: invoice.id,
      method: req.body.method,
      amount,
      paymentDate: req.body.paymentDate || new Date(),
      note: req.body.note || null,
      recordedBy: req.user.id,
      provider: 'MANUAL',
    }, include: paymentInclude });
    await tx.paymentAttempt.updateMany({
      where: { invoiceId: invoice.id, status: 'FAILED', nextRetryAt: { not: null } },
      data: { nextRetryAt: null },
    });
    await createNotification({ userId: created.invoice.customer.user.id, type: 'PAYMENT_RECEIVED', title: 'Payment received', body: `Your payment for invoice ${invoice.number} was recorded.`, href: '/invoices', dedupeKey: `payment-received:${created.id}` }, tx);
    await writeAuditLog(tx, { userId: req.user.id, action: 'PAYMENT_RECORDED', entity: 'Payment', entityId: created.id, details: { invoice: invoice.number, amount: amount.toString(), method: req.body.method } });
    return created;
  });
  void sendReceipt(payment, payment.invoice.customer.user.name, payment.invoice.customer.user.email);
  return res.status(201).json({ success: true, data: { payment }, message: 'Payment recorded.' });
});

function ownedCustomerId(req) {
  if (req.user.role !== 'CUSTOMER' || !req.user.customer?.id) throw new ApiError(403, 'Only customer accounts can start an online payment.');
  return req.user.customer.id;
}

export const razorpayConfig = asyncHandler(async (_req, res) => {
  return res.status(200).json({ success: true, data: { enabled: isRazorpayConfigured(), keyId: isRazorpayConfigured() ? env.RAZORPAY_KEY_ID : null, currency: 'INR' }, message: 'Payment configuration loaded.' });
});

export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const customerId = ownedCustomerId(req);
  if (!isRazorpayConfigured()) throw new ApiError(503, 'Online payments are not configured. Contact the billing team.');
  const invoice = await prisma.invoice.findFirst({ where: { id: req.body.invoiceId, customerId }, include: { customer: { include: { user: true } } } });
  if (!invoice) throw new ApiError(404, 'Invoice not found.');
  if (invoice.status !== 'CONFIRMED') throw new ApiError(409, 'Only confirmed invoices can be paid online.');
  const balance = Number(invoice.total) - Number(invoice.amountPaid);
  if (balance <= 0) throw new ApiError(409, 'This invoice has no outstanding balance.');

  const amountPaise = Math.round(balance * 100);
  const recentSince = new Date(Date.now() - 30 * 60000);
  const existingOrder = await prisma.paymentAttempt.findFirst({ where: { invoiceId: invoice.id, status: 'PENDING', createdAt: { gte: recentSince }, amount: new Prisma.Decimal(balance.toFixed(2)) }, orderBy: { createdAt: 'desc' } });
  if (existingOrder) return res.status(200).json({ success: true, data: {
    keyId: env.RAZORPAY_KEY_ID, orderId: existingOrder.providerOrderId, amount: amountPaise, currency: 'INR',
    invoiceNumber: invoice.number, companyName: env.COMPANY_NAME, customerName: invoice.customer.user.name,
    customerEmail: invoice.customer.user.email, customerContact: invoice.customer.phone || undefined,
  }, message: 'Your existing checkout is ready.' });
  const previousAttempts = await prisma.paymentAttempt.count({ where: { invoiceId: invoice.id, createdAt: { gte: recentSince } } });
  if (previousAttempts >= 4) throw new ApiError(409, 'The maximum number of recent online payment attempts has been reached. Please contact billing.');
  const order = await razorpayRequest('/orders', { method: 'POST', body: {
    amount: amountPaise,
    currency: 'INR',
    receipt: `${invoice.number}-${previousAttempts + 1}`.slice(0, 40),
    notes: { invoiceId: invoice.id, customerId },
  } });
  await prisma.$transaction(async (tx) => {
    await tx.paymentAttempt.updateMany({
      where: { invoiceId: invoice.id, status: 'FAILED', nextRetryAt: { not: null } },
      data: { nextRetryAt: null },
    });
    await tx.paymentAttempt.create({ data: {
      invoiceId: invoice.id,
      providerOrderId: order.id,
      amount: balance.toFixed(2),
      currency: order.currency || 'INR',
      attemptNumber: previousAttempts + 1,
    } });
    await writeAuditLog(tx, { userId: req.user.id, action: 'ONLINE_PAYMENT_STARTED', entity: 'Invoice', entityId: invoice.id, details: { invoice: invoice.number, orderId: order.id } });
  });
  return res.status(201).json({ success: true, data: {
    keyId: env.RAZORPAY_KEY_ID,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    invoiceNumber: invoice.number,
    companyName: env.COMPANY_NAME,
    customerName: invoice.customer.user.name,
    customerEmail: invoice.customer.user.email,
    customerContact: invoice.customer.phone || undefined,
  }, message: 'Payment checkout is ready.' });
});

async function markAttemptFailed({ orderId, reason }) {
  const attempt = await prisma.paymentAttempt.findUnique({ where: { providerOrderId: orderId }, include: { invoice: { include: { customer: { include: { user: true } } } } } });
  if (!attempt || attempt.status === 'SUCCEEDED') return null;
  const nextRetryAt = attempt.attemptNumber < 4 ? new Date(Date.now() + 86400000) : null;
  await prisma.$transaction(async (tx) => {
    await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: 'FAILED', failureReason: String(reason || 'Payment was not completed').slice(0, 500), nextRetryAt } });
    await createNotification({
      userId: attempt.invoice.customer.user.id,
      type: 'PAYMENT_FAILED',
      title: 'Payment could not be completed',
      body: `Payment for invoice ${attempt.invoice.number} did not go through. Retry it from your invoices.`,
      href: '/invoices',
      dedupeKey: `payment-failed:${attempt.id}`,
    }, tx);
    await writeAuditLog(tx, { userId: attempt.invoice.customer.user.id, action: 'ONLINE_PAYMENT_FAILED', entity: 'Invoice', entityId: attempt.invoiceId, details: { invoice: attempt.invoice.number, orderId, reason: String(reason || '').slice(0, 200) } });
  });
  return attempt;
}

async function finalizeRazorpayPayment({ orderId, paymentId, providerPayment }) {
  const attempt = await prisma.paymentAttempt.findUnique({ where: { providerOrderId: orderId }, include: { invoice: { include: { customer: { include: { user: true } } } } } });
  if (!attempt) throw new ApiError(404, 'Payment attempt not found.');
  if (attempt.status === 'SUCCEEDED') return { payment: await prisma.payment.findUnique({ where: { providerPaymentId: paymentId }, include: paymentInclude }), duplicate: true };
  if (!providerPayment || providerPayment.order_id !== orderId || providerPayment.status !== 'captured') throw new ApiError(409, 'The payment provider has not confirmed this payment.');
  if (providerPayment.currency !== 'INR' || Number(providerPayment.amount) !== Math.round(Number(attempt.amount) * 100)) throw new ApiError(409, 'The captured payment amount does not match the invoice balance.');
  let createdNow = false;
  const payment = await prisma.$transaction(async (tx) => {
    const existing = await tx.payment.findUnique({ where: { providerPaymentId: paymentId }, include: paymentInclude });
    if (existing) return existing;
    const invoice = await tx.invoice.findUnique({ where: { id: attempt.invoiceId }, select: { id: true, number: true, total: true, amountPaid: true, status: true } });
    if (!invoice || invoice.status !== 'CONFIRMED') throw new ApiError(409, 'The invoice is no longer payable. Contact billing to reconcile this payment.');
    const amount = new Prisma.Decimal(attempt.amount.toString());
    const total = new Prisma.Decimal(invoice.total.toString());
    const paidBefore = new Prisma.Decimal(invoice.amountPaid.toString());
    if (amount.greaterThan(total.minus(paidBefore))) throw new ApiError(409, 'The invoice balance changed after checkout. Contact billing to reconcile this payment.');
    const paidAfter = paidBefore.plus(amount);
    const update = await tx.invoice.updateMany({ where: { id: invoice.id, status: 'CONFIRMED', amountPaid: { lte: total.minus(amount) } }, data: { amountPaid: { increment: amount }, ...(paidAfter.greaterThanOrEqualTo(total) ? { status: 'PAID' } : {}) } });
    if (update.count !== 1) throw new ApiError(409, 'The invoice balance changed. Contact billing to reconcile this payment.');
    const created = await tx.payment.create({ data: {
      invoiceId: invoice.id,
      method: providerPayment.method === 'upi' ? 'UPI' : 'CARD',
      amount,
      paymentDate: providerPayment.created_at ? new Date(providerPayment.created_at * 1000) : new Date(),
      note: `Razorpay ${paymentId}`,
      recordedBy: attempt.invoice.customer.user.id,
      provider: 'RAZORPAY',
      providerOrderId: orderId,
      providerPaymentId: paymentId,
    }, include: paymentInclude });
    createdNow = true;
    await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: 'SUCCEEDED', providerPaymentId: paymentId, failureReason: null, nextRetryAt: null } });
    await tx.paymentAttempt.updateMany({
      where: { invoiceId: invoice.id, id: { not: attempt.id }, status: 'FAILED', nextRetryAt: { not: null } },
      data: { nextRetryAt: null },
    });
    await createNotification({ userId: attempt.invoice.customer.user.id, type: 'PAYMENT_RECEIVED', title: 'Payment received', body: `Your payment for invoice ${invoice.number} was successful.`, href: '/invoices', dedupeKey: `payment-received:${paymentId}` }, tx);
    await writeAuditLog(tx, { userId: attempt.invoice.customer.user.id, action: 'ONLINE_PAYMENT_RECEIVED', entity: 'Payment', entityId: created.id, details: { invoice: invoice.number, provider: 'RAZORPAY', providerPaymentId: paymentId } });
    return created;
  });
  if (createdNow) void sendReceipt(payment, attempt.invoice.customer.user.name, attempt.invoice.customer.user.email);
  return { payment, duplicate: !createdNow };
}

export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const customerId = ownedCustomerId(req);
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  const attempt = await prisma.paymentAttempt.findFirst({ where: { providerOrderId: orderId, invoice: { customerId } } });
  if (!attempt) throw new ApiError(404, 'Payment attempt not found.');
  const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest();
  const actual = Buffer.from(signature, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new ApiError(400, 'The payment signature is invalid.');
  let providerPayment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
  if (providerPayment.status === 'authorized') providerPayment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/capture`, { method: 'POST', body: { amount: providerPayment.amount, currency: providerPayment.currency } });
  const result = await finalizeRazorpayPayment({ orderId, paymentId, providerPayment });
  return res.status(200).json({ success: true, data: result, message: 'Payment verified and receipt processing started.' });
});

export const reportRazorpayFailure = asyncHandler(async (req, res) => {
  const customerId = ownedCustomerId(req);
  const attempt = await prisma.paymentAttempt.findFirst({ where: { providerOrderId: req.body.orderId, invoice: { customerId } }, select: { providerOrderId: true } });
  if (!attempt) throw new ApiError(404, 'Payment attempt not found.');
  await markAttemptFailed({ orderId: attempt.providerOrderId, reason: req.body.reason });
  return res.status(200).json({ success: true, data: null, message: 'Payment failure was recorded. You can try again later.' });
});

export const razorpayWebhook = asyncHandler(async (req, res) => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) throw new ApiError(503, 'Payment webhook secret is not configured.');
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  if (!verifyHmac(raw, req.get('x-razorpay-signature'), env.RAZORPAY_WEBHOOK_SECRET)) throw new ApiError(400, 'Payment webhook signature is invalid.');
  let event;
  try { event = JSON.parse(raw.toString('utf8')); }
  catch { throw new ApiError(400, 'Payment webhook payload is invalid.'); }
  const payment = event.payload?.payment?.entity;
  if (event.event === 'payment.captured' && payment?.order_id) await finalizeRazorpayPayment({ orderId: payment.order_id, paymentId: payment.id, providerPayment: payment });
  else if (event.event === 'payment.failed' && payment?.order_id) await markAttemptFailed({ orderId: payment.order_id, reason: payment.error_description || payment.error_reason });
  return res.status(200).json({ success: true, data: { received: true }, message: 'Webhook received.' });
});
