import 'dotenv/config';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { addPeriod } from '../src/utils/billingDates.js';
import { nextDocumentNumber } from '../src/services/numbering.service.js';
import { env } from '../src/config/env.js';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The built-in demo seed is for local development only.');
}

const prisma = new PrismaClient();
const passwordHashes = new Map();
const isLarge = process.argv.includes('--large') || process.env.SEED_LARGE === 'true';
const targetSubscriptions = isLarge ? 5000 : 50;
const now = new Date();

async function passwordHash(password) {
  if (!passwordHashes.has(password)) passwordHashes.set(password, await bcrypt.hash(password, 12));
  return passwordHashes.get(password);
}

async function ensureUser({ name, email, role, password, companyName }) {
  const hash = await passwordHash(password);
  const user = await prisma.user.upsert({
    where: { email },
    create: { name, email, passwordHash: hash, role, ...(companyName ? { customer: { create: { companyName } } } : {}) },
    update: { name, role, isActive: true },
    include: { customer: true },
  });
  if (companyName) {
    const profile = await prisma.customer.upsert({
      where: { userId: user.id },
      create: { userId: user.id, companyName },
      update: { companyName },
    });
    return { ...user, customer: profile };
  }
  return user;
}

async function findOrCreateByName(model, name, create, update) {
  const existing = await model.findFirst({ where: { name } });
  return existing ? model.update({ where: { id: existing.id }, data: update }) : model.create({ data: create });
}

function daysFrom(date, days) { const value = new Date(date); value.setUTCDate(value.getUTCDate() + days); return value; }
function daysAgo(days) { return daysFrom(now, -days); }
function statusAt(index) {
  const slot = index % 10;
  if (slot <= 1) return 'DRAFT';
  if (slot <= 3) return 'QUOTATION';
  if (slot === 4) return 'CONFIRMED';
  if (slot <= 8) return 'ACTIVE';
  return 'CLOSED';
}

async function createSeedUsers() {
  const admin = await ensureUser({ name: 'Darkside Admin', email: 'admin@brightloop.com', role: 'ADMIN', password: 'Admin@12345' });
  const staff = await Promise.all([
    ensureUser({ name: 'Avery Morgan', email: 'staff1@brightloop.com', role: 'STAFF', password: 'Staff@12345' }),
    ensureUser({ name: 'Jordan Lee', email: 'staff2@brightloop.com', role: 'STAFF', password: 'Staff@12345' }),
  ]);
  const customers = [];
  for (let index = 1; index <= 10; index += 1) {
    customers.push(await ensureUser({
      name: `Customer ${String(index).padStart(2, '0')}`,
      email: `customer${String(index).padStart(2, '0')}@brightloop.com`,
      role: 'CUSTOMER',
      password: 'Customer@12345',
      companyName: `Darkside Client ${String(index).padStart(2, '0')}`,
    }));
  }
  return { admin, staff, customers };
}

async function createCatalog() {
  const productInput = [
    ['Cloud Backup', 'SOFTWARE', 1290, 420],
    ['Security Suite', 'SOFTWARE', 2190, 780],
    ['CRM Platform', 'SERVICE', 3490, 1300],
    ['Analytics Pro', 'SOFTWARE', 2790, 950],
    ['Support Desk', 'SERVICE', 890, 300],
    ['Device Management', 'HARDWARE', 1590, 680],
  ];
  const products = [];
  for (const [name, type, salesPrice, costPrice] of productInput) products.push(await findOrCreateByName(
    prisma.product,
    name,
    { name, type, salesPrice, costPrice, isActive: true, notes: `${name} subscription product.` },
    { type, salesPrice, costPrice, isActive: true },
  ));

  const variantSets = [
    [['Brand', 'Odoo', 560], ['Region', 'Global', 180]],
    [['Edition', 'Advanced', 700]],
    [['Deployment', 'Managed', 900]],
    [['Capacity', 'Plus', 480]],
    [['Support', '24/7', 350]],
    [['Device tier', 'Enterprise', 620]],
  ];
  const variants = [];
  for (let productIndex = 0; productIndex < products.length; productIndex += 1) {
    const productVariants = [];
    for (const [attribute, value, extraPrice] of variantSets[productIndex]) productVariants.push(await prisma.productVariant.upsert({
      where: { productId_attribute_value: { productId: products[productIndex].id, attribute, value } },
      create: { productId: products[productIndex].id, attribute, value, extraPrice },
      update: { extraPrice },
    }));
    variants.push(productVariants);
  }

  const planInput = [
    { name: 'Daily Essentials', price: 99, billingPeriod: 'DAILY', minQuantity: 1, allowCloseEarly: true, allowPause: true, allowRenew: true, autoClose: false },
    { name: 'Weekly Teams', price: 499, billingPeriod: 'WEEKLY', minQuantity: 1, allowCloseEarly: true, allowPause: true, allowRenew: true, autoClose: false },
    { name: 'Monthly Growth', price: 1499, billingPeriod: 'MONTHLY', minQuantity: 1, allowCloseEarly: true, allowPause: true, allowRenew: true, autoClose: false },
    { name: 'Annual Scale', price: 14999, billingPeriod: 'YEARLY', minQuantity: 1, allowCloseEarly: false, allowPause: false, allowRenew: true, autoClose: true },
    { name: 'Monthly Enterprise', price: 4999, billingPeriod: 'MONTHLY', minQuantity: 2, allowCloseEarly: true, allowPause: false, allowRenew: true, autoClose: false },
  ];
  const plans = [];
  for (const plan of planInput) plans.push(await findOrCreateByName(prisma.plan, plan.name, { ...plan, isActive: true }, { ...plan, isActive: true }));

  const taxInput = [
    { name: 'Standard GST', ratePercent: 18, isActive: true },
    { name: 'Service GST', ratePercent: 12, isActive: true, productType: 'SERVICE' },
    { name: 'Cloud Backup GST', ratePercent: 5, isActive: true, productId: products[0].id },
  ];
  const taxes = [];
  for (const tax of taxInput) {
    const existing = await prisma.tax.findFirst({ where: { name: tax.name } });
    taxes.push(existing ? await prisma.tax.update({ where: { id: existing.id }, data: tax }) : await prisma.tax.create({ data: tax }));
  }

  const discountInput = [
    { name: 'Launch 10%', type: 'PERCENTAGE', value: 10, minPurchase: 500, minQuantity: 1, appliesTo: 'SUBSCRIPTION', isActive: true },
    { name: 'Odoo Setup Credit', type: 'FIXED', value: 560, minPurchase: 1000, minQuantity: 1, appliesTo: 'PRODUCT', productId: products[0].id, isActive: true },
    { name: 'Annual Loyalty', type: 'PERCENTAGE', value: 5, minPurchase: 1000, minQuantity: 1, appliesTo: 'SUBSCRIPTION', usageLimit: 500, usedCount: 0, isActive: true },
  ];
  const discounts = [];
  for (const discount of discountInput) {
    const existing = await prisma.discount.findFirst({ where: { name: discount.name } });
    discounts.push(existing ? await prisma.discount.update({ where: { id: existing.id }, data: discount }) : await prisma.discount.create({ data: discount }));
  }

  const templateInput = [
    { name: 'Cloud Essentials Quote', validityDays: 14, planId: plans[2].id, lines: [{ productId: products[0].id, variantId: variants[0][0].id, quantity: 1 }, { productId: products[4].id, quantity: 1 }] },
    { name: 'Growth Suite Quote', validityDays: 30, planId: plans[3].id, lines: [{ productId: products[1].id, variantId: variants[1][0].id, quantity: 2 }, { productId: products[3].id, quantity: 1 }] },
  ];
  const templates = [];
  for (const template of templateInput) {
    const existing = await prisma.quotationTemplate.findFirst({ where: { name: template.name } });
    if (existing) {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.quotationTemplateLine.deleteMany({ where: { templateId: existing.id } });
        return tx.quotationTemplate.update({ where: { id: existing.id }, data: { name: template.name, validityDays: template.validityDays, planId: template.planId, lines: { create: template.lines.map((line) => ({ ...line, variantId: line.variantId || null })) } }, include: { lines: true } });
      });
      templates.push(updated);
    } else templates.push(await prisma.quotationTemplate.create({ data: { name: template.name, validityDays: template.validityDays, planId: template.planId, lines: { create: template.lines.map((line) => ({ ...line, variantId: line.variantId || null })) } }, include: { lines: true } }));
  }
  return { products, variants, plans, taxes, discounts, templates };
}

async function createSeedSubscriptions({ admin, customers }, catalog) {
  const existing = await prisma.subscription.findMany({ where: { paymentTerms: { startsWith: 'DEMO-SEED-' } }, select: { paymentTerms: true } });
  const existingMarkers = new Set(existing.map((item) => item.paymentTerms));
  const yearCounters = new Map();
  const rows = [];
  const lineRows = [];
  let createdCount = 0;
  for (let index = 0; index < targetSubscriptions; index += 1) {
    const marker = `DEMO-SEED-${index + 1}`;
    if (existingMarkers.has(marker)) continue;
    const customer = customers[(index * 7) % customers.length];
    const plan = catalog.plans[index % catalog.plans.length];
    const productIndex = index % catalog.products.length;
    const product = catalog.products[productIndex];
    const variant = catalog.variants[productIndex][index % catalog.variants[productIndex].length];
    const startDate = daysAgo(14 + ((index * 19) % 340));
    const status = statusAt(index);
    const planPrice = Number(plan.price);
    const extraPrice = Number(variant.extraPrice);
    const unitPrice = Number(product.salesPrice) + extraPrice;
    const lineQuantity = index % 5 === 0 ? 2 : 1;
    const subscriptionId = randomUUID();
    const sequenceYear = startDate.getUTCFullYear();
    if (!yearCounters.has(sequenceYear)) {
      const key = `sub:${sequenceYear}`;
      const sequence = await prisma.numberSequence.upsert({ where: { key }, create: { key, currentValue: 0 }, update: {} });
      yearCounters.set(sequenceYear, sequence.currentValue);
    }
    const sequenceNumber = yearCounters.get(sequenceYear) + 1;
    yearCounters.set(sequenceYear, sequenceNumber);
    let nextBillingDate = null;
    let pausedAt = null;
    if (status === 'ACTIVE') {
      nextBillingDate = index % 7 === 0 ? daysAgo(1 + index % 3) : daysFrom(now, 1 + index % 30);
      if (index % 17 === 0) pausedAt = daysAgo(2);
    }
    const expiryDate = status === 'CLOSED' ? daysAgo(1 + index % 70) : index % 4 === 0 ? daysFrom(now, 120 + index % 90) : null;
    const quoteUntil = ['DRAFT', 'QUOTATION'].includes(status) ? daysFrom(startDate, 14) : null;
    rows.push({
      id: subscriptionId,
      number: `SUB-${sequenceYear}-${String(sequenceNumber).padStart(5, '0')}`,
      customerId: customer.customer.id,
      planId: plan.id,
      startDate,
      expiryDate,
      quotationValidUntil: quoteUntil,
      nextBillingDate,
      paymentTerms: marker,
      status,
      pausedAt,
      createdBy: admin.id,
      createdAt: startDate,
      updatedAt: now,
    });
    lineRows.push({
      id: randomUUID(),
      subscriptionId,
      productId: product.id,
      variantId: variant.id,
      quantity: Math.max(plan.minQuantity, lineQuantity),
      unitPrice,
      taxId: catalog.taxes[index % catalog.taxes.length].id,
      amount: unitPrice * Math.max(plan.minQuantity, lineQuantity),
    });
    createdCount += 1;
  }

  for (let offset = 0; offset < rows.length; offset += 250) {
    const batch = rows.slice(offset, offset + 250);
    const ids = new Set(batch.map((row) => row.id));
    const batchLines = lineRows.filter((line) => ids.has(line.subscriptionId));
    await prisma.$transaction(async (tx) => {
      await tx.subscription.createMany({ data: batch });
      await tx.subscriptionLine.createMany({ data: batchLines });
      const batchYears = new Set(batch.map((row) => row.startDate.getUTCFullYear()));
      for (const batchYear of batchYears) await tx.numberSequence.upsert({
        where: { key: `sub:${batchYear}` },
        create: { key: `sub:${batchYear}`, currentValue: yearCounters.get(batchYear) },
        update: { currentValue: yearCounters.get(batchYear) },
      });
    });
    console.log(`Seeded ${Math.min(offset + batch.length, rows.length)} of ${rows.length} new subscriptions…`);
  }
  return createdCount;
}

async function createSampleInvoices({ admin }) {
  const seedSubs = await prisma.subscription.findMany({
    where: { paymentTerms: { startsWith: 'DEMO-SEED-' }, status: 'ACTIVE' },
    include: { plan: true, customer: true, lines: { include: { product: true, variant: true, tax: true } } },
    orderBy: { number: 'asc' },
    take: 50,
  });
  let createdCount = 0;
  for (const subscription of seedSubs) {
    const periodStart = subscription.startDate;
    const periodEnd = addPeriod(periodStart, subscription.plan.billingPeriod);
    const existing = await prisma.invoice.findUnique({ where: { subscriptionId_billingPeriodStart_billingPeriodEnd: { subscriptionId: subscription.id, billingPeriodStart: periodStart, billingPeriodEnd: periodEnd } }, select: { id: true } });
    if (existing) continue;
    const issueDate = periodEnd;
    const dueDate = daysFrom(issueDate, 14);
    const invoiceIndex = Number(subscription.paymentTerms.replace('DEMO-SEED-', ''));
    const status = invoiceIndex % 4 === 0 ? 'PAID' : invoiceIndex % 4 === 1 ? 'CONFIRMED' : invoiceIndex % 4 === 2 ? 'DRAFT' : 'CONFIRMED';
    const baseLines = [{ description: `${subscription.plan.name} subscription fee`, quantity: 1, unitPrice: Number(subscription.plan.price), discountAmount: 0, taxRate: 0, taxAmount: 0, amount: Number(subscription.plan.price) }];
    let subtotal = Number(subscription.plan.price);
    let taxTotal = 0;
    for (const line of subscription.lines) {
      const lineBase = Number(line.amount);
      const taxRate = line.tax?.isActive ? Number(line.tax.ratePercent) : 0;
      const taxAmount = Math.round(lineBase * taxRate) / 100;
      subtotal += lineBase;
      taxTotal += taxAmount;
      baseLines.push({ description: `${line.product.name}${line.variant ? ` · ${line.variant.attribute}: ${line.variant.value}` : ''}`, quantity: line.quantity, unitPrice: Number(line.unitPrice), discountAmount: 0, taxRate, taxAmount, amount: lineBase + taxAmount });
    }
    const total = Math.round((subtotal + taxTotal) * 100) / 100;
    const partial = Math.round(total / 2 * 100) / 100;
    const amountPaid = status === 'PAID' ? total : status === 'CONFIRMED' && invoiceIndex % 3 === 0 ? partial : 0;
    await prisma.$transaction(async (tx) => {
      const number = await nextDocumentNumber(tx, 'INV', issueDate);
      const invoice = await tx.invoice.create({ data: {
        number,
        subscriptionId: subscription.id,
        customerId: subscription.customerId,
        billingPeriodStart: periodStart,
        billingPeriodEnd: periodEnd,
        issueDate,
        dueDate,
        subtotal,
        discountTotal: 0,
        taxTotal,
        total,
        amountPaid,
        status,
        lines: { create: baseLines },
      } });
      if (amountPaid > 0) await tx.payment.create({ data: {
        invoiceId: invoice.id,
        method: ['CARD', 'UPI', 'BANK_TRANSFER', 'CASH'][invoiceIndex % 4],
        amount: amountPaid,
        paymentDate: daysFrom(issueDate, 2),
        note: status === 'PAID' ? 'Seeded settled payment' : 'Seeded partial payment',
        recordedBy: admin.id,
      } });
    });
    createdCount += 1;
  }
  return createdCount;
}

try {
  const users = await createSeedUsers();
  const catalog = await createCatalog();
  await prisma.companySettings.upsert({ where: { id: 'main' }, create: { id: 'main', companyName: env.COMPANY_NAME, companyEmail: env.COMPANY_EMAIL, companyAddress: env.COMPANY_ADDRESS || null }, update: {} });
  const createdSubscriptions = await createSeedSubscriptions(users, catalog);
  const createdInvoices = await createSampleInvoices(users);
  const totalSubscriptions = await prisma.subscription.count();
  console.log(`Development seed ready: ${users.customers.length} customers, ${catalog.products.length} products, ${catalog.plans.length} plans, ${createdSubscriptions} new subscriptions, ${createdInvoices} new invoices.`);
  console.log(`Subscription total in database: ${totalSubscriptions}${isLarge ? ' (large seed target: 5,000)' : ' (standard seed target: 50 demo subscriptions)'}.`);
  console.log('Demo passwords: admin@brightloop.com / Admin@12345; staff accounts / Staff@12345; customer accounts / Customer@12345.');
} finally {
  await prisma.$disconnect();
}
