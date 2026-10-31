import { prisma } from '../config/db.js';
import { addPeriod } from '../utils/billingDates.js';
import { ApiError } from '../utils/apiError.js';
import { nextDocumentNumber } from './numbering.service.js';
import { writeAuditLog } from '../utils/audit.js';

const MAX_CATCH_UP_PERIODS = 2400;
const BATCH_SIZE = 50;
const includeBilling = {
  plan: true,
  pendingPlan: true,
  customer: true,
  lines: { include: { product: true, variant: true, tax: true } },
};

function round(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
function startOfUtcDay(date) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }
function endOfUtcDay(date) { return new Date(startOfUtcDay(date).getTime() + 86400000 - 1); }
function addDueDays(date, terms) {
  const days = Number(String(terms || '').match(/\d+/)?.[0] || 14);
  const dueDate = new Date(date);
  dueDate.setUTCDate(dueDate.getUTCDate() + Math.min(days, 365));
  return dueDate;
}
function discountValue(discount, eligibleAmount) {
  const raw = discount.type === 'PERCENTAGE' ? eligibleAmount * Number(discount.value) / 100 : Number(discount.value);
  return round(Math.min(eligibleAmount, raw));
}

function allocate(rows, amount, predicate) {
  const targets = rows.filter(predicate);
  const weightTotal = targets.reduce((sum, row) => sum + Math.max(0, row.base - row.discount), 0);
  if (!targets.length || amount <= 0 || weightTotal <= 0) return [];
  let remaining = amount;
  return targets.map((row, index) => {
    const current = Math.max(0, row.base - row.discount);
    const share = index === targets.length - 1 ? remaining : round(amount * current / weightTotal);
    const applied = round(Math.min(current, share));
    remaining = round(remaining - applied);
    row.discount = round(row.discount + applied);
    return applied;
  });
}

async function loadTax(tx, line) {
  if (line.tax?.isActive) return line.tax;
  const productRule = await tx.tax.findFirst({ where: { productId: line.productId, isActive: true }, orderBy: { ratePercent: 'desc' } });
  if (productRule) return productRule;
  return tx.tax.findFirst({ where: { productType: line.product.type, productId: null, isActive: true }, orderBy: { ratePercent: 'desc' } });
}

async function claimDiscount(tx, discount, issueDate) {
  return tx.discount.updateMany({
    where: {
      id: discount.id,
      isActive: true,
      ...(discount.usageLimit !== null ? { usedCount: { lt: discount.usageLimit } } : {}),
      OR: [{ startDate: null }, { startDate: { lte: issueDate } }],
      AND: [{ OR: [{ endDate: null }, { endDate: { gte: issueDate } }] }],
    },
    data: { usedCount: { increment: 1 } },
  });
}

async function buildInvoiceLines(tx, subscription, issueDate) {
  const rows = [{
    description: `${subscription.plan.name} subscription fee`,
    quantity: 1,
    unitPrice: round(subscription.plan.price),
    base: round(subscription.plan.price),
    discount: 0,
    taxRate: 0,
    productId: null,
  }];
  for (const line of subscription.lines) {
    const unitPrice = round(line.unitPrice);
    const base = round(unitPrice * line.quantity);
    const tax = await loadTax(tx, line);
    rows.push({
      description: `${line.product.name}${line.variant ? ` · ${line.variant.attribute}: ${line.variant.value}` : ''}`,
      quantity: line.quantity,
      unitPrice,
      base,
      discount: 0,
      taxRate: tax ? Number(tax.ratePercent) : 0,
      productId: line.productId,
    });
  }

  const discounts = await tx.discount.findMany({
    where: {
      isActive: true,
      OR: [{ startDate: null }, { startDate: { lte: issueDate } }],
      AND: [{ OR: [{ endDate: null }, { endDate: { gte: issueDate } }] }],
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  const appliedDiscountLines = [];
  const productQuantity = subscription.lines.reduce((sum, line) => sum + line.quantity, 0);

  for (const discount of discounts) {
    if (discount.usageLimit !== null && discount.usedCount >= discount.usageLimit) continue;
    if (discount.minQuantity > productQuantity) continue;

    if (discount.appliesTo === 'PRODUCT') {
      const matches = rows.filter((row) => row.productId === discount.productId);
      const eligibleAmount = round(matches.reduce((sum, row) => sum + Math.max(0, row.base - row.discount), 0));
      const eligibleQuantity = subscription.lines.filter((line) => line.productId === discount.productId).reduce((sum, line) => sum + line.quantity, 0);
      if (!matches.length || eligibleQuantity < discount.minQuantity || eligibleAmount <= 0) continue;
      if (discount.minPurchase !== null && eligibleAmount < Number(discount.minPurchase)) continue;
      const amount = discountValue(discount, eligibleAmount);
      if (!amount || !(await claimDiscount(tx, discount, issueDate)).count) continue;
      allocate(rows, amount, (row) => row.productId === discount.productId);
      appliedDiscountLines.push({ description: `Discount · ${discount.name}`, amount });
      continue;
    }

    const eligibleAmount = round(rows.reduce((sum, row) => sum + Math.max(0, row.base - row.discount), 0));
    if (eligibleAmount <= 0 || (discount.minPurchase !== null && eligibleAmount < Number(discount.minPurchase))) continue;
    const amount = discountValue(discount, eligibleAmount);
    if (!amount || !(await claimDiscount(tx, discount, issueDate)).count) continue;
    allocate(rows, amount, () => true);
    appliedDiscountLines.push({ description: `Discount · ${discount.name}`, amount });
  }

  const subtotal = round(rows.reduce((sum, row) => sum + row.base, 0));
  const discountTotal = round(appliedDiscountLines.reduce((sum, item) => sum + item.amount, 0));
  const invoiceLines = rows.map((row) => {
    const discountAmount = round(row.discount);
    const net = round(Math.max(0, row.base - discountAmount));
    const taxAmount = round(net * row.taxRate / 100);
    return {
      description: row.description,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      discountAmount,
      taxRate: row.taxRate,
      taxAmount,
      amount: round(row.base + taxAmount),
    };
  });
  for (const item of appliedDiscountLines) invoiceLines.push({
    description: item.description,
    quantity: 1,
    unitPrice: 0,
    discountAmount: item.amount,
    taxRate: 0,
    taxAmount: 0,
    amount: -item.amount,
  });
  const taxTotal = round(invoiceLines.reduce((sum, line) => sum + line.taxAmount, 0));
  const total = round(Math.max(0, subtotal - discountTotal + taxTotal));
  return { lines: invoiceLines, subtotal, discountTotal, taxTotal, total };
}

async function createPeriodInvoice(tx, subscription, periodStart, periodEnd, issueDate, actorId) {
  const existing = await tx.invoice.findUnique({ where: { subscriptionId_billingPeriodStart_billingPeriodEnd: { subscriptionId: subscription.id, billingPeriodStart: periodStart, billingPeriodEnd: periodEnd } }, select: { id: true, number: true } });
  if (existing) return { created: false, invoice: existing };
  const totals = await buildInvoiceLines(tx, subscription, issueDate);
  const number = await nextDocumentNumber(tx, 'INV', issueDate);
  const invoice = await tx.invoice.create({ data: {
    number,
    subscriptionId: subscription.id,
    customerId: subscription.customerId,
    billingPeriodStart: periodStart,
    billingPeriodEnd: periodEnd,
    issueDate,
    dueDate: addDueDays(issueDate, subscription.paymentTerms),
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    taxTotal: totals.taxTotal,
    total: totals.total,
    status: 'DRAFT',
    lines: { create: totals.lines },
  }, select: { id: true, number: true } });
  if (actorId) await writeAuditLog(tx, { userId: actorId, action: 'INVOICE_GENERATED', entity: 'Invoice', entityId: invoice.id });
  return { created: true, invoice };
}

export async function generateInvoicesForSubscription(subscriptionId, { actorId = null, forceOne = false, asOf = new Date() } = {}) {
  return prisma.$transaction(async (tx) => {
    let subscription = await tx.subscription.findUnique({ where: { id: subscriptionId }, include: includeBilling });
    if (!subscription) throw new ApiError(404, 'Subscription not found.');
    if (subscription.status !== 'ACTIVE') throw new ApiError(409, 'Only active subscriptions can be billed.');
    if (subscription.pausedAt) throw new ApiError(409, 'Paused subscriptions cannot be billed.');
    if (subscription.pendingPlanId && subscription.pendingPlan) {
      const previousPlan = subscription.plan.name;
      subscription = await tx.subscription.update({ where: { id: subscription.id }, data: { planId: subscription.pendingPlanId, pendingPlanId: null }, include: includeBilling });
      await writeAuditLog(tx, { userId: subscription.createdBy, action: 'SCHEDULED_PLAN_CHANGE_APPLIED', entity: 'Subscription', entityId: subscription.id, details: { from: previousPlan, to: subscription.plan.name } });
    }
    let cursor = subscription.nextBillingDate || subscription.startDate;
    const lastDueDate = endOfUtcDay(asOf);
    const results = { created: [], skipped: [], periods: 0 };
    while ((forceOne && results.periods === 0) || (!forceOne && cursor <= lastDueDate)) {
      if (results.periods >= MAX_CATCH_UP_PERIODS) throw new ApiError(409, 'Billing catch-up exceeded the safety limit of 2,400 periods.');
      if (subscription.expiryDate && cursor >= subscription.expiryDate) break;
      const periodStart = cursor;
      const periodEnd = addPeriod(periodStart, subscription.plan.billingPeriod);
      const result = await createPeriodInvoice(tx, subscription, periodStart, periodEnd, asOf, actorId);
      (result.created ? results.created : results.skipped).push(result.invoice);
      cursor = periodEnd;
      results.periods += 1;
    }
    if (results.periods) await tx.subscription.update({ where: { id: subscription.id }, data: { nextBillingDate: cursor } });
    return results;
  });
}

export async function runDueBilling({ actorId = null, asOf = new Date() } = {}) {
  const due = await prisma.subscription.findMany({
    where: { status: 'ACTIVE', pausedAt: null, nextBillingDate: { lte: endOfUtcDay(asOf) } },
    select: { id: true },
    orderBy: [{ nextBillingDate: 'asc' }, { id: 'asc' }],
  });
  const summary = { subscriptions: due.length, created: 0, skipped: 0, failed: 0, failures: [] };
  for (let offset = 0; offset < due.length; offset += BATCH_SIZE) {
    const batch = due.slice(offset, offset + BATCH_SIZE);
    for (const { id } of batch) {
      try {
        const result = await generateInvoicesForSubscription(id, { actorId, asOf });
        summary.created += result.created.length;
        summary.skipped += result.skipped.length;
      } catch (error) {
        summary.failed += 1;
        if (summary.failures.length < 25) summary.failures.push({ subscriptionId: id, message: error.message });
      }
    }
  }
  return summary;
}

export async function closeExpiredSubscriptions(asOf = new Date()) {
  const result = await prisma.subscription.updateMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { expiryDate: { lte: asOf }, plan: { autoClose: true } },
        { plan: { autoClose: true, endDate: { lte: asOf } } },
      ],
    },
    data: { status: 'CLOSED', closedAt: asOf, pausedAt: null, pendingPlanId: null },
  });
  return result.count;
}
