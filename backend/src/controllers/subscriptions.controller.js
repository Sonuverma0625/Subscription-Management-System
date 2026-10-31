import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { nextDocumentNumber } from '../services/numbering.service.js';
import { writeAuditLog } from '../utils/audit.js';
import { addPeriod } from '../utils/billingDates.js';

const lineInclude = { product: true, variant: true, tax: true };
const detailInclude = {
  customer: { include: { user: { select: { id: true, name: true, email: true } } } },
  plan: true,
  pendingPlan: true,
  creator: { select: { id: true, name: true, email: true } },
  lines: { include: lineInclude },
  invoices: { select: { id: true, number: true, status: true, issueDate: true, dueDate: true, total: true, amountPaid: true }, orderBy: { issueDate: 'desc' } },
};

function money(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }

async function getSubscriptionLines(tx, lines) {
  const rows = [];
  for (const input of lines) {
    const product = await tx.product.findUnique({ where: { id: input.productId }, include: { variants: true } });
    if (!product || !product.isActive) throw new ApiError(400, 'Subscription lines must use active products.');
    const variant = input.variantId ? product.variants.find((item) => item.id === input.variantId) : null;
    if (input.variantId && !variant) throw new ApiError(400, 'A selected variant does not belong to its product.');
    let taxId = input.taxId || null;
    if (taxId) {
      const tax = await tx.tax.findFirst({ where: { id: taxId, isActive: true } });
      if (!tax) throw new ApiError(400, 'Choose an active tax rule.');
    }
    const unitPrice = money(Number(product.salesPrice) + Number(variant?.extraPrice || 0));
    rows.push({ productId: product.id, variantId: variant?.id || null, taxId, quantity: input.quantity, unitPrice, amount: money(unitPrice * input.quantity) });
  }
  return rows;
}

async function assertPlanAvailable(plan, startDate) {
  if (!plan || !plan.isActive) throw new ApiError(400, 'Choose an active plan.');
  if (plan.startDate && startDate < plan.startDate) throw new ApiError(400, 'This plan is not available yet.');
  if (plan.endDate && startDate > plan.endDate) throw new ApiError(400, 'This plan is no longer available.');
}

function validateMinimumQuantity(plan, lines) {
  const totalQuantity = lines.reduce((total, line) => total + line.quantity, 0);
  if (totalQuantity < plan.minQuantity) throw new ApiError(400, `This plan requires at least ${plan.minQuantity} total item${plan.minQuantity === 1 ? '' : 's'}.`);
}

function subscriptionWhereFromQuery(query, user) {
  const where = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.customerId && user.role !== 'CUSTOMER' ? { customerId: query.customerId } : {}),
    ...(query.planId ? { planId: query.planId } : {}),
    ...(query.startDateFrom || query.startDateTo ? { startDate: { ...(query.startDateFrom ? { gte: query.startDateFrom } : {}), ...(query.startDateTo ? { lte: query.startDateTo } : {}) } } : {}),
    ...(user.role === 'CUSTOMER' ? { customerId: user.customer?.id || '__no-customer__' } : {}),
  };
  if (query.search) {
    where.OR = [
      { number: { contains: query.search, mode: 'insensitive' } },
      { customer: { companyName: { contains: query.search, mode: 'insensitive' } } },
      { customer: { user: { email: { contains: query.search, mode: 'insensitive' } } } },
      { plan: { name: { contains: query.search, mode: 'insensitive' } } },
    ];
  }
  return where;
}

async function assertSubscriptionAccess(subscriptionId, user, include = detailInclude) {
  const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId }, include });
  if (!subscription) throw new ApiError(404, 'Subscription not found.');
  if (user.role === 'CUSTOMER' && subscription.customerId !== user.customer?.id) throw new ApiError(404, 'Subscription not found.');
  return subscription;
}

export const listSubscriptions = asyncHandler(async (req, res) => {
  const { page, limit, sort, order, ...filters } = req.validatedQuery;
  const where = subscriptionWhereFromQuery(filters, req.user);
  const [items, total] = await prisma.$transaction([
    prisma.subscription.findMany({ where, include: detailInclude, orderBy: { [sort]: order }, skip: (page - 1) * limit, take: limit }),
    prisma.subscription.count({ where }),
  ]);
  return res.status(200).json({ success: true, data: items, message: 'Subscriptions loaded.', meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const getSubscription = asyncHandler(async (req, res) => {
  const subscription = await assertSubscriptionAccess(req.params.id, req.user);
  return res.status(200).json({ success: true, data: { subscription }, message: 'Subscription loaded.' });
});

export const createSubscription = asyncHandler(async (req, res) => {
  const startDate = req.body.startDate;
  const customer = await prisma.customer.findFirst({ where: { id: req.body.customerId, user: { isActive: true } }, select: { id: true } });
  if (!customer) throw new ApiError(404, 'Active customer not found.');
  const plan = await prisma.plan.findUnique({ where: { id: req.body.planId } });
  await assertPlanAvailable(plan, startDate);
  const lines = await getSubscriptionLines(prisma, req.body.lines);
  validateMinimumQuantity(plan, lines);

  const year = startDate.getUTCFullYear();
  const subscription = await prisma.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, 'SUB', startDate);
    const created = await tx.subscription.create({
      data: {
        number,
        customerId: customer.id,
        planId: plan.id,
        startDate,
        expiryDate: req.body.expiryDate || null,
        quotationValidUntil: req.body.quotationValidUntil || null,
        paymentTerms: req.body.paymentTerms || null,
        createdBy: req.user.id,
        lines: { create: lines },
      },
      include: detailInclude,
    });
    await writeAuditLog(tx, { userId: req.user.id, action: 'SUBSCRIPTION_CREATED', entity: 'Subscription', entityId: created.id });
    return created;
  });
  return res.status(201).json({ success: true, data: { subscription }, message: 'Draft subscription created.' });
});

export const createSubscriptionFromTemplate = asyncHandler(async (req, res) => {
  const template = await prisma.quotationTemplate.findUnique({ where: { id: req.params.templateId }, include: { plan: true, lines: true } });
  if (!template) throw new ApiError(404, 'Quotation template not found.');
  const startDate = req.body.startDate || new Date();
  const customer = await prisma.customer.findFirst({ where: { id: req.body.customerId, user: { isActive: true } }, select: { id: true } });
  if (!customer) throw new ApiError(404, 'Active customer not found.');
  await assertPlanAvailable(template.plan, startDate);
  const lines = await getSubscriptionLines(prisma, template.lines);
  validateMinimumQuantity(template.plan, lines);
  const quotationValidUntil = new Date(startDate);
  quotationValidUntil.setUTCDate(quotationValidUntil.getUTCDate() + template.validityDays);

  const subscription = await prisma.$transaction(async (tx) => {
    const number = await nextDocumentNumber(tx, 'SUB', startDate);
    const created = await tx.subscription.create({ data: {
      number,
      customerId: customer.id,
      planId: template.planId,
      startDate,
      expiryDate: req.body.expiryDate || null,
      quotationValidUntil,
      paymentTerms: req.body.paymentTerms || null,
      createdBy: req.user.id,
      lines: { create: lines },
    }, include: detailInclude });
    await writeAuditLog(tx, { userId: req.user.id, action: 'SUBSCRIPTION_CREATED_FROM_TEMPLATE', entity: 'Subscription', entityId: created.id });
    return created;
  });
  return res.status(201).json({ success: true, data: { subscription }, message: `Draft created from ${template.name}.` });
});

export const updateSubscription = asyncHandler(async (req, res) => {
  const existing = await prisma.subscription.findUnique({ where: { id: req.params.id }, include: { lines: true, plan: true } });
  if (!existing) throw new ApiError(404, 'Subscription not found.');
  if (!['DRAFT', 'QUOTATION'].includes(existing.status)) throw new ApiError(409, 'Only draft subscriptions and quotations can be edited.');
  const startDate = req.body.startDate || existing.startDate;
  const planId = req.body.planId || existing.planId;
  const customerId = req.body.customerId || existing.customerId;
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  await assertPlanAvailable(plan, startDate);
  const customer = await prisma.customer.findFirst({ where: { id: customerId, user: { isActive: true } }, select: { id: true } });
  if (!customer) throw new ApiError(404, 'Active customer not found.');
  const lineInputs = req.body.lines || existing.lines.map(({ productId, variantId, taxId, quantity }) => ({ productId, variantId, taxId, quantity }));
  const lines = await getSubscriptionLines(prisma, lineInputs);
  validateMinimumQuantity(plan, lines);

  const updated = await prisma.$transaction(async (tx) => {
    if (req.body.lines) await tx.subscriptionLine.deleteMany({ where: { subscriptionId: existing.id } });
    const result = await tx.subscription.update({ where: { id: existing.id }, data: {
      ...(req.body.customerId ? { customerId: customerId } : {}),
      ...(req.body.planId ? { planId } : {}),
      ...(req.body.startDate ? { startDate } : {}),
      ...(Object.hasOwn(req.body, 'expiryDate') ? { expiryDate: req.body.expiryDate } : {}),
      ...(Object.hasOwn(req.body, 'quotationValidUntil') ? { quotationValidUntil: req.body.quotationValidUntil } : {}),
      ...(Object.hasOwn(req.body, 'paymentTerms') ? { paymentTerms: req.body.paymentTerms } : {}),
      ...(req.body.lines ? { lines: { create: lines } } : {}),
      nextBillingDate: req.body.startDate ? null : undefined,
    }, include: detailInclude });
    await writeAuditLog(tx, { userId: req.user.id, action: 'SUBSCRIPTION_UPDATED', entity: 'Subscription', entityId: result.id });
    return result;
  });
  return res.status(200).json({ success: true, data: { subscription: updated }, message: 'Subscription updated.' });
});

export const deleteSubscription = asyncHandler(async (req, res) => {
  const existing = await prisma.subscription.findUnique({ where: { id: req.params.id }, select: { id: true, status: true } });
  if (!existing) throw new ApiError(404, 'Subscription not found.');
  if (existing.status !== 'DRAFT') throw new ApiError(409, 'Only draft subscriptions can be deleted.');
  try { await prisma.subscription.delete({ where: { id: existing.id } }); } catch (error) {
    if (error.code === 'P2003' || error.code === 'P2014') throw new ApiError(409, 'This subscription has related records and cannot be deleted.');
    throw error;
  }
  await writeAuditLog(prisma, { userId: req.user.id, action: 'SUBSCRIPTION_DELETED', entity: 'Subscription', entityId: existing.id });
  return res.status(200).json({ success: true, data: null, message: 'Draft subscription deleted.' });
});

async function transition(req, res, { from, to, action, mutate }) {
  const current = await prisma.subscription.findUnique({ where: { id: req.params.id }, include: { plan: true } });
  if (!current) throw new ApiError(404, 'Subscription not found.');
  if (current.status !== from) throw new ApiError(409, `Cannot ${action.toLowerCase()} a subscription in ${current.status} status.`);
  const extra = await mutate?.(current);
  const updated = await prisma.$transaction(async (tx) => {
    const changed = await tx.subscription.updateMany({ where: { id: current.id, status: from }, data: { ...(to ? { status: to } : {}), ...extra } });
    if (changed.count !== 1) throw new ApiError(409, 'The subscription changed before this action completed. Reload and try again.');
    const result = await tx.subscription.findUnique({ where: { id: current.id }, include: detailInclude });
    await writeAuditLog(tx, { userId: req.user.id, action: `SUBSCRIPTION_${action}`, entity: 'Subscription', entityId: result.id });
    return result;
  });
  return res.status(200).json({ success: true, data: { subscription: updated }, message: `${action[0]}${action.slice(1).toLowerCase()} completed.` });
}

export const sendQuotation = asyncHandler(async (req, res) => transition(req, res, {
  from: 'DRAFT', to: 'QUOTATION', action: 'QUOTATION_SENT',
  mutate: (current) => ({ quotationValidUntil: current.quotationValidUntil || new Date(Date.now() + 14 * 86400000) }),
}));

export const confirmSubscription = asyncHandler(async (req, res) => transition(req, res, { from: 'QUOTATION', to: 'CONFIRMED', action: 'CONFIRMED' }));

export const activateSubscription = asyncHandler(async (req, res) => transition(req, res, {
  from: 'CONFIRMED', to: 'ACTIVE', action: 'ACTIVATED',
  mutate: async (current) => {
    const startDate = current.startDate;
    await assertPlanAvailable(current.plan, startDate);
    return { nextBillingDate: current.nextBillingDate || startDate };
  },
}));

export const pauseSubscription = asyncHandler(async (req, res) => {
  const current = await prisma.subscription.findUnique({ where: { id: req.params.id }, include: { plan: true } });
  if (!current) throw new ApiError(404, 'Subscription not found.');
  if (current.status !== 'ACTIVE') throw new ApiError(409, 'Only active subscriptions can be paused.');
  if (!current.plan.allowPause) throw new ApiError(403, 'This plan does not allow pausing.');
  if (current.pausedAt) throw new ApiError(409, 'This subscription is already paused.');
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.subscription.update({ where: { id: current.id }, data: { pausedAt: new Date() }, include: detailInclude });
    await writeAuditLog(tx, { userId: req.user.id, action: 'SUBSCRIPTION_PAUSED', entity: 'Subscription', entityId: result.id });
    return result;
  });
  return res.status(200).json({ success: true, data: { subscription: updated }, message: 'Subscription paused.' });
});

export const resumeSubscription = asyncHandler(async (req, res) => {
  const current = await prisma.subscription.findUnique({ where: { id: req.params.id }, include: { plan: true } });
  if (!current) throw new ApiError(404, 'Subscription not found.');
  if (current.status !== 'ACTIVE' || !current.pausedAt) throw new ApiError(409, 'This subscription is not paused.');
  const shift = Math.max(0, Date.now() - current.pausedAt.getTime());
  const shiftedNextBillingDate = current.nextBillingDate
    ? current.nextBillingDate <= current.pausedAt ? new Date() : new Date(current.nextBillingDate.getTime() + shift)
    : null;
  const shiftedExpiryDate = current.expiryDate ? new Date(current.expiryDate.getTime() + shift) : null;
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.subscription.update({ where: { id: current.id }, data: { pausedAt: null, nextBillingDate: shiftedNextBillingDate, expiryDate: shiftedExpiryDate }, include: detailInclude });
    await writeAuditLog(tx, { userId: req.user.id, action: 'SUBSCRIPTION_RESUMED', entity: 'Subscription', entityId: result.id });
    return result;
  });
  return res.status(200).json({ success: true, data: { subscription: updated }, message: 'Subscription resumed.' });
});

export const renewSubscription = asyncHandler(async (req, res) => {
  const current = await prisma.subscription.findUnique({ where: { id: req.params.id }, include: { plan: true } });
  if (!current) throw new ApiError(404, 'Subscription not found.');
  if (current.status !== 'ACTIVE') throw new ApiError(409, 'Only active subscriptions can be renewed.');
  if (!current.plan.allowRenew) throw new ApiError(403, 'This plan does not allow renewal.');
  const periods = req.body.periods;
  const anchor = current.expiryDate || current.nextBillingDate || current.startDate;
  let expiryDate = anchor;
  for (let count = 0; count < periods; count += 1) expiryDate = addPeriod(expiryDate, current.plan.billingPeriod);
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.subscription.update({ where: { id: current.id }, data: { expiryDate }, include: detailInclude });
    await writeAuditLog(tx, { userId: req.user.id, action: 'SUBSCRIPTION_RENEWED', entity: 'Subscription', entityId: result.id });
    return result;
  });
  return res.status(200).json({ success: true, data: { subscription: updated }, message: 'Subscription renewed.' });
});

export const closeSubscription = asyncHandler(async (req, res) => {
  const current = await prisma.subscription.findUnique({ where: { id: req.params.id }, include: { plan: true } });
  if (!current) throw new ApiError(404, 'Subscription not found.');
  if (current.status !== 'ACTIVE') throw new ApiError(409, 'Only active subscriptions can be closed.');
  if (!current.plan.allowCloseEarly && (!current.expiryDate || current.expiryDate > new Date())) throw new ApiError(403, 'This plan does not allow early closure.');
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.subscription.update({ where: { id: current.id }, data: { status: 'CLOSED', closedAt: new Date(), pausedAt: null, pendingPlanId: null }, include: detailInclude });
    await writeAuditLog(tx, { userId: req.user.id, action: 'SUBSCRIPTION_CLOSED', entity: 'Subscription', entityId: result.id });
    return result;
  });
  return res.status(200).json({ success: true, data: { subscription: updated }, message: 'Subscription closed.' });
});

