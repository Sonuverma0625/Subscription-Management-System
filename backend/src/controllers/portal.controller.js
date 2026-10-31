import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAuditLog } from '../utils/audit.js';
import { addPeriod } from '../utils/billingDates.js';

async function getOwnedSubscription(req) {
  const customerId = req.user.customer?.id;
  if (!customerId) throw new ApiError(404, 'Customer account not found.');
  const subscription = await prisma.subscription.findFirst({ where: { id: req.params.id, customerId }, include: { plan: true, pendingPlan: true, lines: { select: { quantity: true } } } });
  if (!subscription) throw new ApiError(404, 'Subscription not found.');
  return subscription;
}

async function auditedUpdate(req, res, data, action, message) {
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.subscription.update({ where: { id: req.params.id }, data, include: { plan: true, pendingPlan: true } });
    await writeAuditLog(tx, { userId: req.user.id, action, entity: 'Subscription', entityId: result.id });
    return result;
  });
  return res.status(200).json({ success: true, data: { subscription: updated }, message });
}

export const portalSummary = asyncHandler(async (req, res) => {
  const customerId = req.user.customer?.id;
  if (!customerId) throw new ApiError(404, 'Customer account not found.');
  // The local PGlite development server is configured with a small connection
  // pool. Keep this dashboard's reads sequential so a customer page load does
  // not exhaust it alongside auth and notification requests.
  const subscriptions = await prisma.subscription.findMany({ where: { customerId, status: 'ACTIVE' }, include: { plan: true, pendingPlan: true }, orderBy: { nextBillingDate: 'asc' } });
  const invoices = await prisma.invoice.findMany({ where: { customerId, status: { in: ['DRAFT', 'CONFIRMED', 'PAID'] } }, select: { id: true, number: true, total: true, amountPaid: true, status: true, dueDate: true, issueDate: true }, orderBy: { issueDate: 'desc' }, take: 10 });
  const payments = await prisma.payment.findMany({ where: { invoice: { customerId } }, include: { invoice: { select: { number: true } } }, orderBy: { paymentDate: 'desc' }, take: 10 });
  const outstanding = invoices.filter((invoice) => invoice.status !== 'PAID').reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total) - Number(invoice.amountPaid)), 0);
  const upcoming = subscriptions.find((subscription) => !subscription.pausedAt && subscription.nextBillingDate >= new Date()) || null;
  return res.status(200).json({ success: true, data: {
    activeSubscriptions: subscriptions.length,
    upcomingRenewal: upcoming ? { subscriptionId: upcoming.id, number: upcoming.number, date: upcoming.nextBillingDate, plan: upcoming.plan.name } : null,
    outstanding: Math.round(outstanding * 100) / 100,
    subscriptions: subscriptions.slice(0, 6),
    invoices,
    payments,
  }, message: 'Customer portal loaded.' });
});

export const customerPauseSubscription = asyncHandler(async (req, res) => {
  const subscription = await getOwnedSubscription(req);
  if (subscription.status !== 'ACTIVE') throw new ApiError(409, 'Only active subscriptions can be paused.');
  if (!subscription.plan.allowPause) throw new ApiError(403, 'This plan does not allow pausing.');
  if (subscription.pausedAt) throw new ApiError(409, 'This subscription is already paused.');
  return auditedUpdate(req, res, { pausedAt: new Date() }, 'CUSTOMER_SUBSCRIPTION_PAUSED', 'Pause request applied.');
});

export const customerResumeSubscription = asyncHandler(async (req, res) => {
  const subscription = await getOwnedSubscription(req);
  if (subscription.status !== 'ACTIVE' || !subscription.pausedAt) throw new ApiError(409, 'This subscription is not paused.');
  const shift = Math.max(0, Date.now() - subscription.pausedAt.getTime());
  return auditedUpdate(req, res, {
    pausedAt: null,
    nextBillingDate: subscription.nextBillingDate
      ? subscription.nextBillingDate <= subscription.pausedAt ? new Date() : new Date(subscription.nextBillingDate.getTime() + shift)
      : null,
    expiryDate: subscription.expiryDate ? new Date(subscription.expiryDate.getTime() + shift) : null,
  }, 'CUSTOMER_SUBSCRIPTION_RESUMED', 'Subscription resumed.');
});

export const customerRenewSubscription = asyncHandler(async (req, res) => {
  const subscription = await getOwnedSubscription(req);
  if (subscription.status !== 'ACTIVE') throw new ApiError(409, 'Only active subscriptions can be renewed.');
  if (!subscription.plan.allowRenew) throw new ApiError(403, 'This plan does not allow renewal.');
  const expiryDate = addPeriod(subscription.expiryDate || subscription.nextBillingDate || subscription.startDate, subscription.plan.billingPeriod);
  return auditedUpdate(req, res, { expiryDate }, 'CUSTOMER_SUBSCRIPTION_RENEWED', 'Subscription renewal applied.');
});

export const customerCancelSubscription = asyncHandler(async (req, res) => {
  const subscription = await getOwnedSubscription(req);
  if (subscription.status !== 'ACTIVE') throw new ApiError(409, 'Only active subscriptions can be cancelled.');
  if (!subscription.plan.allowCloseEarly && (!subscription.expiryDate || subscription.expiryDate > new Date())) throw new ApiError(403, 'This plan does not allow early cancellation.');
  return auditedUpdate(req, res, { status: 'CLOSED', closedAt: new Date(), pausedAt: null, pendingPlanId: null }, 'CUSTOMER_SUBSCRIPTION_CANCELLED', 'Subscription cancelled.');
});

export const listCustomerPlans = asyncHandler(async (_req, res) => {
  const now = new Date();
  const items = await prisma.plan.findMany({
    where: { isActive: true, AND: [{ OR: [{ startDate: null }, { startDate: { lte: now } }] }, { OR: [{ endDate: null }, { endDate: { gte: now } }] }] },
    select: { id: true, name: true, price: true, billingPeriod: true, minQuantity: true },
    orderBy: [{ price: 'asc' }, { name: 'asc' }],
  });
  return res.status(200).json({ success: true, data: items, message: 'Available plans loaded.' });
});

export const customerChangePlan = asyncHandler(async (req, res) => {
  const subscription = await getOwnedSubscription(req);
  if (subscription.status !== 'ACTIVE') throw new ApiError(409, 'Only active subscriptions can change plans.');
  const nextPlanId = req.body.planId || null;
  if (nextPlanId === subscription.planId && !subscription.pendingPlanId) throw new ApiError(409, 'This is already the current plan.');
  const now = new Date();
  const plan = nextPlanId ? await prisma.plan.findFirst({ where: { id: nextPlanId, isActive: true, AND: [{ OR: [{ startDate: null }, { startDate: { lte: now } }] }, { OR: [{ endDate: null }, { endDate: { gte: now } }] }] } }) : null;
  if (nextPlanId && !plan) throw new ApiError(404, 'The selected plan is unavailable.');
  const quantity = subscription.lines.reduce((sum, line) => sum + line.quantity, 0);
  if (plan && quantity < plan.minQuantity) throw new ApiError(409, `This plan requires at least ${plan.minQuantity} total units.`);
  return auditedUpdate(req, res, { pendingPlanId: plan?.id || null }, 'CUSTOMER_PLAN_CHANGE_SCHEDULED', plan ? `Plan change to ${plan.name} is scheduled for the next billing date.` : 'Scheduled plan change cancelled.');
});
