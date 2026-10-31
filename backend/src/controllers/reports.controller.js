import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCached } from '../services/reportCache.service.js';

const dueNow = () => new Date();
const subscriptionWhere = (filters) => ({
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.customerId ? { customerId: filters.customerId } : {}),
  ...(filters.planId ? { planId: filters.planId } : {}),
  ...(filters.from || filters.to ? { startDate: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } : {}),
});
const invoiceWhere = (filters) => ({
  ...(filters.customerId ? { customerId: filters.customerId } : {}),
  ...(filters.planId || filters.status ? { subscription: { ...(filters.planId ? { planId: filters.planId } : {}), ...(filters.status ? { status: filters.status } : {}) } } : {}),
  ...(filters.from || filters.to ? { issueDate: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } : {}),
});
const paymentWhere = (filters) => ({
  ...(filters.from || filters.to ? { paymentDate: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } : {}),
  ...(filters.customerId || filters.planId || filters.status ? { invoice: {
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.planId || filters.status ? { subscription: { ...(filters.planId ? { planId: filters.planId } : {}), ...(filters.status ? { status: filters.status } : {}) } } : {}),
  } } : {}),
});

function monthlyValue(amount, period) {
  if (period === 'DAILY') return amount * 30.4375;
  if (period === 'WEEKLY') return amount * 4.345;
  if (period === 'YEARLY') return amount / 12;
  return amount;
}

function reportSqlFilters(filters, invoiceAlias = 'i', paymentAlias = 'p', subscriptionAlias = 's') {
  const clauses = [];
  if (filters.from) clauses.push(Prisma.sql`${paymentAlias === 'p' ? Prisma.raw('p."paymentDate"') : Prisma.raw(`${invoiceAlias}."issueDate"`)} >= ${filters.from}`);
  if (filters.to) clauses.push(Prisma.sql`${paymentAlias === 'p' ? Prisma.raw('p."paymentDate"') : Prisma.raw(`${invoiceAlias}."issueDate"`)} <= ${filters.to}`);
  if (filters.customerId) clauses.push(Prisma.sql`${invoiceAlias}."customerId" = ${filters.customerId}`);
  if (filters.planId) clauses.push(Prisma.sql`${subscriptionAlias}."planId" = ${filters.planId}`);
  if (filters.status) clauses.push(Prisma.sql`${subscriptionAlias}."status" = ${filters.status}`);
  return clauses.length ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}` : Prisma.empty;
}

async function getSeries(filters) {
  const paymentFilters = reportSqlFilters(filters, 'i', 'p', 's');
  const invoiceFilters = reportSqlFilters(filters, 'i', 'i', 's');
  const revenueByMonth = await prisma.$queryRaw(Prisma.sql`
    SELECT TO_CHAR(DATE_TRUNC('month', p."paymentDate"), 'YYYY-MM') AS "month", COALESCE(SUM(p."amount"), 0)::numeric AS "amount"
    FROM "Payment" p
    JOIN "Invoice" i ON i."id" = p."invoiceId"
    JOIN "Subscription" s ON s."id" = i."subscriptionId"
    ${paymentFilters}
    GROUP BY DATE_TRUNC('month', p."paymentDate")
    ORDER BY DATE_TRUNC('month', p."paymentDate")
  `);
  const mrrTrend = await prisma.$queryRaw(Prisma.sql`
    SELECT TO_CHAR(DATE_TRUNC('month', i."billingPeriodStart"), 'YYYY-MM') AS "month",
      COALESCE(SUM(CASE p."billingPeriod"
        WHEN 'DAILY' THEN i."total" * 30.4375
        WHEN 'WEEKLY' THEN i."total" * 4.345
        WHEN 'YEARLY' THEN i."total" / 12
        ELSE i."total"
      END), 0)::numeric AS "amount"
    FROM "Invoice" i
    JOIN "Subscription" s ON s."id" = i."subscriptionId"
    JOIN "Plan" p ON p."id" = s."planId"
    ${invoiceFilters}
    GROUP BY DATE_TRUNC('month', i."billingPeriodStart")
    ORDER BY DATE_TRUNC('month', i."billingPeriodStart")
  `);
  return { revenueByMonth: revenueByMonth.map((row) => ({ month: row.month, amount: Number(row.amount) })), mrrTrend: mrrTrend.map((row) => ({ month: row.month, amount: Number(row.amount) })) };
}

async function buildSummary(filters) {
  const now = dueNow();
  const periodStart = new Date(now.getTime() - 30 * 86400000);
  const insightFilter = { ...(filters.customerId ? { customerId: filters.customerId } : {}), ...(filters.planId ? { planId: filters.planId } : {}) };
  const active = await prisma.subscription.findMany({ where: { ...subscriptionWhere(filters), status: 'ACTIVE' }, select: { createdAt: true, plan: { select: { price: true, billingPeriod: true } }, lines: { select: { amount: true } } } });
  const collected = await prisma.payment.aggregate({ where: paymentWhere(filters), _sum: { amount: true } });
  const outstandingInvoices = await prisma.invoice.findMany({ where: { ...invoiceWhere(filters), status: 'CONFIRMED' }, select: { total: true, amountPaid: true } });
  const overdue = await prisma.invoice.findMany({ where: { ...invoiceWhere(filters), status: 'CONFIRMED', dueDate: { lt: now } }, select: { id: true, number: true, dueDate: true, total: true, amountPaid: true, customer: { select: { companyName: true } }, subscription: { select: { number: true } } }, orderBy: { dueDate: 'asc' }, take: 100 });
  const statusRows = await prisma.subscription.groupBy({ by: ['status'], where: subscriptionWhere(filters), _count: { _all: true } });
  const methodRows = await prisma.payment.groupBy({ by: ['method'], where: paymentWhere(filters), _sum: { amount: true }, _count: { _all: true } });
  const recentPayments = await prisma.payment.findMany({ where: paymentWhere(filters), include: { invoice: { select: { number: true, customer: { select: { companyName: true } } } }, recorder: { select: { name: true } } }, orderBy: { paymentDate: 'desc' }, take: 8 });
  const recentSubscriptions = await prisma.subscription.findMany({ where: subscriptionWhere(filters), include: { customer: { select: { companyName: true } }, plan: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 8 });
  const recentlyClosed = await prisma.subscription.findMany({ where: { ...insightFilter, status: 'CLOSED', closedAt: { gte: periodStart, lte: now } }, select: { plan: { select: { price: true, billingPeriod: true } }, lines: { select: { amount: true } } } });
  const renewalsNext30 = await prisma.subscription.count({ where: { ...insightFilter, status: 'ACTIVE', pausedAt: null, nextBillingDate: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) } } });
  const overdueAll = await prisma.invoice.findMany({ where: { ...invoiceWhere(filters), status: 'CONFIRMED', dueDate: { lt: now } }, select: { dueDate: true, total: true, amountPaid: true } });
  const series = await getSeries(filters);
  const mrr = active.reduce((total, subscription) => {
    const recurring = Number(subscription.plan.price) + subscription.lines.reduce((sum, line) => sum + Number(line.amount), 0);
    return total + monthlyValue(recurring, subscription.plan.billingPeriod);
  }, 0);
  const outstandingAmount = outstandingInvoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total) - Number(invoice.amountPaid)), 0);
  const monthlyMrr = (subscription) => monthlyValue(Number(subscription.plan.price) + subscription.lines.reduce((sum, line) => sum + Number(line.amount), 0), subscription.plan.billingPeriod);
  const newMrr = active.filter((subscription) => subscription.createdAt >= periodStart).reduce((sum, subscription) => sum + monthlyMrr(subscription), 0);
  const lostMrr = recentlyClosed.reduce((sum, subscription) => sum + monthlyMrr(subscription), 0);
  const priorMrr = Math.max(0, mrr - newMrr + lostMrr);
  const newSubscriptions = active.filter((subscription) => subscription.createdAt >= periodStart).length;
  const startingSubscriptions = Math.max(0, active.length - newSubscriptions + recentlyClosed.length);
  const overdueByMonthMap = new Map();
  let overdueAmount = 0;
  for (const invoice of overdueAll) {
    const balance = Math.max(0, Number(invoice.total) - Number(invoice.amountPaid));
    if (!balance) continue;
    overdueAmount += balance;
    const month = invoice.dueDate.toISOString().slice(0, 7);
    const current = overdueByMonthMap.get(month) || { month, count: 0, amount: 0 };
    current.count += 1;
    current.amount += balance;
    overdueByMonthMap.set(month, current);
  }
  const overdueByMonth = [...overdueByMonthMap.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-6).map((row) => ({ ...row, amount: Number(row.amount.toFixed(2)) }));
  return {
    kpis: {
      activeSubscriptions: active.length,
      mrr: Number(mrr.toFixed(2)),
      revenueCollected: Number(collected._sum.amount || 0),
      outstandingAmount: Number(outstandingAmount.toFixed(2)),
      overdueInvoices: overdue.filter((invoice) => Number(invoice.amountPaid) < Number(invoice.total)).length,
    },
    subscriptionsByStatus: statusRows.map((row) => ({ status: row.status, count: row._count._all })),
    paymentsByMethod: methodRows.map((row) => ({ method: row.method, count: row._count._all, amount: Number(row._sum.amount || 0) })),
    overdueInvoices: overdue.filter((invoice) => Number(invoice.amountPaid) < Number(invoice.total)).slice(0, 8).map((invoice) => ({ ...invoice, daysOverdue: Math.max(1, Math.floor((now - invoice.dueDate) / 86400000)), outstanding: Number(invoice.total) - Number(invoice.amountPaid) })),
    insights: {
      mrrGrowthPercent: priorMrr > 0 ? Number(((mrr - priorMrr) / priorMrr * 100).toFixed(1)) : (mrr > 0 ? 100 : 0),
      churnRate: startingSubscriptions > 0 ? Number((recentlyClosed.length / startingSubscriptions * 100).toFixed(1)) : 0,
      renewalsNext30,
      overdueAmount: Number(overdueAmount.toFixed(2)),
      overdueByMonth,
    },
    recentPayments,
    recentSubscriptions,
    ...series,
  };
}

export const reportSummary = asyncHandler(async (req, res) => {
  const filters = req.validatedQuery;
  const key = `summary:${JSON.stringify({ ...filters, from: filters.from?.toISOString(), to: filters.to?.toISOString() })}`;
  const data = await getCached(key, () => buildSummary(filters));
  return res.status(200).json({ success: true, data, message: 'Report summary loaded.', meta: { cachedForSeconds: 15 } });
});

export const reportRevenue = asyncHandler(async (req, res) => {
  const data = await getCached(`revenue:${JSON.stringify(req.validatedQuery, (_key, value) => value instanceof Date ? value.toISOString() : value)}`, () => getSeries(req.validatedQuery));
  return res.status(200).json({ success: true, data, message: 'Revenue series loaded.' });
});

export const reportOverdue = asyncHandler(async (req, res) => {
  const { page, limit, ...filters } = req.validatedQuery;
  const now = dueNow();
  const where = { ...invoiceWhere(filters), status: 'CONFIRMED', dueDate: { lt: now } };
  const [all, total] = await prisma.$transaction([
    prisma.invoice.findMany({ where, include: { customer: { select: { companyName: true } }, subscription: { select: { number: true, plan: { select: { name: true } } } } }, orderBy: { dueDate: 'asc' } }),
    prisma.invoice.count({ where }),
  ]);
  const items = all.filter((item) => Number(item.amountPaid) < Number(item.total)).slice((page - 1) * limit, page * limit).map((item) => ({ ...item, outstanding: Number(item.total) - Number(item.amountPaid), daysOverdue: Math.max(1, Math.floor((now - item.dueDate) / 86400000)) }));
  return res.status(200).json({ success: true, data: items, message: 'Overdue invoices loaded.', meta: { page, limit, total: items.length ? total : 0, pages: Math.ceil(total / limit) } });
});

export const reportActiveSubscriptions = asyncHandler(async (req, res) => {
  const { page, limit, ...filters } = req.validatedQuery;
  const where = { ...subscriptionWhere(filters), status: 'ACTIVE' };
  const [items, total] = await prisma.$transaction([
    prisma.subscription.findMany({ where, include: { customer: { select: { companyName: true } }, plan: true }, orderBy: { nextBillingDate: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.subscription.count({ where }),
  ]);
  return res.status(200).json({ success: true, data: items, message: 'Active subscriptions loaded.', meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export const reportPayments = asyncHandler(async (req, res) => {
  const { page, limit, ...filters } = req.validatedQuery;
  const where = paymentWhere(filters);
  const [items, total] = await prisma.$transaction([
    prisma.payment.findMany({ where, include: { invoice: { select: { number: true, customer: { select: { companyName: true } } } }, recorder: { select: { name: true } } }, orderBy: { paymentDate: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.payment.count({ where }),
  ]);
  return res.status(200).json({ success: true, data: items, message: 'Report payments loaded.', meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

function csvCell(value) {
  const text = value instanceof Date ? value.toISOString() : value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
function csvDocument(headers, rows) { return [headers.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\r\n'); }

export const exportReportCsv = asyncHandler(async (req, res) => {
  const { type, ...filters } = req.validatedQuery;
  let csv;
  let fileName;
  if (type === 'subscriptions') {
    const rows = await prisma.subscription.findMany({ where: subscriptionWhere(filters), include: { customer: { select: { companyName: true } }, plan: { select: { name: true, billingPeriod: true } } }, orderBy: { createdAt: 'desc' }, take: 10000 });
    csv = csvDocument(['number', 'customer', 'plan', 'billingPeriod', 'status', 'startDate', 'expiryDate', 'nextBillingDate'], rows.map((item) => [item.number, item.customer.companyName, item.plan.name, item.plan.billingPeriod, item.status, item.startDate, item.expiryDate, item.nextBillingDate]));
    fileName = 'darkside-subscriptions.csv';
  } else if (type === 'payments') {
    const rows = await prisma.payment.findMany({ where: paymentWhere(filters), include: { invoice: { select: { number: true, customer: { select: { companyName: true } } } }, recorder: { select: { name: true } } }, orderBy: { paymentDate: 'desc' }, take: 10000 });
    csv = csvDocument(['invoice', 'customer', 'method', 'amount', 'paymentDate', 'note', 'recordedBy'], rows.map((item) => [item.invoice.number, item.invoice.customer.companyName, item.method, item.amount, item.paymentDate, item.note, item.recorder.name]));
    fileName = 'darkside-payments.csv';
  } else {
    const where = { ...invoiceWhere(filters), ...(type === 'overdue' ? { status: 'CONFIRMED', dueDate: { lt: new Date() } } : {}) };
    const rows = await prisma.invoice.findMany({ where, include: { customer: { select: { companyName: true } }, subscription: { select: { number: true } } }, orderBy: { issueDate: 'desc' }, take: 10000 });
    const filtered = type === 'overdue' ? rows.filter((item) => Number(item.amountPaid) < Number(item.total)) : rows;
    csv = csvDocument(['number', 'subscription', 'customer', 'status', 'issueDate', 'dueDate', 'subtotal', 'discountTotal', 'taxTotal', 'total', 'amountPaid', 'outstanding'], filtered.map((item) => [item.number, item.subscription.number, item.customer.companyName, item.status, item.issueDate, item.dueDate, item.subtotal, item.discountTotal, item.taxTotal, item.total, item.amountPaid, Number(item.total) - Number(item.amountPaid)]));
    fileName = type === 'overdue' ? 'darkside-overdue-invoices.csv' : 'darkside-invoices.csv';
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.status(200).send(`\uFEFF${csv}`);
});
