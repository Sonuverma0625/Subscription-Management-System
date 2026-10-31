import { prisma } from '../config/db.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAuditLog } from '../utils/audit.js';

function sendList(res, items, total, page, limit, message) {
  return res.status(200).json({
    success: true,
    data: items,
    message,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

function activeFilter(value) {
  return value === undefined ? {} : { isActive: value === 'true' };
}

function mapConstraintError(error, label) {
  if (error.code === 'P2002') throw new ApiError(409, `${label} already exists.`);
  const databaseCode = error.code || error.meta?.code || error.cause?.code;
  const restrictedReference = /violates (?:RESTRICT|foreign key)|foreign key constraint/i.test(error.message || '');
  if (['P2003', 'P2014', '23001', '23503'].includes(databaseCode) || restrictedReference) {
    throw new ApiError(409, `This ${label.toLowerCase()} is already in use and cannot be deleted.`);
  }
  throw error;
}

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive } = req.validatedQuery;
  const where = {
    ...activeFilter(isActive),
    ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { notes: { contains: search, mode: 'insensitive' } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({ where, include: { variants: { orderBy: [{ attribute: 'asc' }, { value: 'asc' }] } }, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.product.count({ where }),
  ]);
  return sendList(res, items, total, page, limit, 'Products loaded.');
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await prisma.product.create({ data: req.body });
  await writeAuditLog(prisma, { userId: req.user.id, action: 'PRODUCT_CREATED', entity: 'Product', entityId: product.id });
  return res.status(201).json({ success: true, data: { product }, message: 'Product created.' });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!existing) throw new ApiError(404, 'Product not found.');
  const product = await prisma.product.update({ where: { id: existing.id }, data: req.body, include: { variants: true } });
  await writeAuditLog(prisma, { userId: req.user.id, action: 'PRODUCT_UPDATED', entity: 'Product', entityId: product.id });
  return res.status(200).json({ success: true, data: { product }, message: 'Product updated.' });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
  } catch (error) {
    if (error.code === 'P2025') throw new ApiError(404, 'Product not found.');
    mapConstraintError(error, 'Product');
  }
  await writeAuditLog(prisma, { userId: req.user.id, action: 'PRODUCT_DELETED', entity: 'Product', entityId: req.params.id });
  return res.status(200).json({ success: true, data: null, message: 'Product deleted.' });
});

async function assertProduct(productId) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new ApiError(404, 'Product not found.');
}

export const createVariant = asyncHandler(async (req, res) => {
  await assertProduct(req.params.id);
  try {
    const variant = await prisma.productVariant.create({ data: { ...req.body, productId: req.params.id } });
    await writeAuditLog(prisma, { userId: req.user.id, action: 'PRODUCT_VARIANT_CREATED', entity: 'ProductVariant', entityId: variant.id });
    return res.status(201).json({ success: true, data: { variant }, message: 'Product variant created.' });
  } catch (error) { mapConstraintError(error, 'Variant'); }
});

export const updateVariant = asyncHandler(async (req, res) => {
  const variant = await prisma.productVariant.findFirst({ where: { id: req.params.variantId, productId: req.params.id } });
  if (!variant) throw new ApiError(404, 'Variant not found for this product.');
  try {
    const updated = await prisma.productVariant.update({ where: { id: variant.id }, data: req.body });
    await writeAuditLog(prisma, { userId: req.user.id, action: 'PRODUCT_VARIANT_UPDATED', entity: 'ProductVariant', entityId: updated.id });
    return res.status(200).json({ success: true, data: { variant: updated }, message: 'Product variant updated.' });
  } catch (error) { mapConstraintError(error, 'Variant'); }
});

export const deleteVariant = asyncHandler(async (req, res) => {
  const variant = await prisma.productVariant.findFirst({ where: { id: req.params.variantId, productId: req.params.id }, select: { id: true } });
  if (!variant) throw new ApiError(404, 'Variant not found for this product.');
  try { await prisma.productVariant.delete({ where: { id: variant.id } }); } catch (error) { mapConstraintError(error, 'Variant'); }
  await writeAuditLog(prisma, { userId: req.user.id, action: 'PRODUCT_VARIANT_DELETED', entity: 'ProductVariant', entityId: variant.id });
  return res.status(200).json({ success: true, data: null, message: 'Variant deleted.' });
});

export const listPlans = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive } = req.validatedQuery;
  const where = { ...activeFilter(isActive), ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.plan.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit, include: { _count: { select: { subscriptions: true } } } }),
    prisma.plan.count({ where }),
  ]);
  return sendList(res, items, total, page, limit, 'Plans loaded.');
});

export const createPlan = asyncHandler(async (req, res) => {
  const plan = await prisma.plan.create({ data: req.body });
  await writeAuditLog(prisma, { userId: req.user.id, action: 'PLAN_CREATED', entity: 'Plan', entityId: plan.id });
  return res.status(201).json({ success: true, data: { plan }, message: 'Plan created.' });
});

export const updatePlan = asyncHandler(async (req, res) => {
  try {
    const existing = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, 'Plan not found.');
    const effectiveStart = Object.hasOwn(req.body, 'startDate') ? req.body.startDate : existing.startDate;
    const effectiveEnd = Object.hasOwn(req.body, 'endDate') ? req.body.endDate : existing.endDate;
    if (effectiveStart && effectiveEnd && effectiveEnd < effectiveStart) throw new ApiError(400, 'End date must be on or after the available-from date.');
    const plan = await prisma.plan.update({ where: { id: req.params.id }, data: req.body });
    await writeAuditLog(prisma, { userId: req.user.id, action: 'PLAN_UPDATED', entity: 'Plan', entityId: plan.id });
    return res.status(200).json({ success: true, data: { plan }, message: 'Plan updated.' });
  } catch (error) {
    if (error.code === 'P2025') throw new ApiError(404, 'Plan not found.');
    throw error;
  }
});

export const deletePlan = asyncHandler(async (req, res) => {
  try { await prisma.plan.delete({ where: { id: req.params.id } }); } catch (error) {
    if (error.code === 'P2025') throw new ApiError(404, 'Plan not found.');
    mapConstraintError(error, 'Plan');
  }
  await writeAuditLog(prisma, { userId: req.user.id, action: 'PLAN_DELETED', entity: 'Plan', entityId: req.params.id });
  return res.status(200).json({ success: true, data: null, message: 'Plan deleted.' });
});

export const listTaxes = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive } = req.validatedQuery;
  const where = { ...activeFilter(isActive), ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.tax.findMany({ where, include: { product: { select: { id: true, name: true } } }, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.tax.count({ where }),
  ]);
  return sendList(res, items, total, page, limit, 'Tax rules loaded.');
});

async function validateTaxTarget(data) {
  if (data.productId) {
    const product = await prisma.product.findUnique({ where: { id: data.productId }, select: { id: true } });
    if (!product) throw new ApiError(404, 'Tax target product not found.');
  }
}

export const createTax = asyncHandler(async (req, res) => {
  await validateTaxTarget(req.body);
  const tax = await prisma.tax.create({ data: req.body });
  await writeAuditLog(prisma, { userId: req.user.id, action: 'TAX_CREATED', entity: 'Tax', entityId: tax.id });
  return res.status(201).json({ success: true, data: { tax }, message: 'Tax rule created.' });
});

export const updateTax = asyncHandler(async (req, res) => {
  const existing = await prisma.tax.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Tax rule not found.');
  const data = { ...req.body };
  await validateTaxTarget(data);
  const effectiveProductId = Object.hasOwn(req.body, 'productId') ? req.body.productId : existing.productId;
  const effectiveProductType = Object.hasOwn(req.body, 'productType') ? req.body.productType : existing.productType;
  if (effectiveProductId && effectiveProductType) throw new ApiError(400, 'Choose either one product or one product type for a tax rule.');
  const tax = await prisma.tax.update({ where: { id: existing.id }, data });
  await writeAuditLog(prisma, { userId: req.user.id, action: 'TAX_UPDATED', entity: 'Tax', entityId: tax.id });
  return res.status(200).json({ success: true, data: { tax }, message: 'Tax rule updated.' });
});

export const deleteTax = asyncHandler(async (req, res) => {
  try { await prisma.tax.delete({ where: { id: req.params.id } }); } catch (error) {
    if (error.code === 'P2025') throw new ApiError(404, 'Tax rule not found.');
    mapConstraintError(error, 'Tax rule');
  }
  await writeAuditLog(prisma, { userId: req.user.id, action: 'TAX_DELETED', entity: 'Tax', entityId: req.params.id });
  return res.status(200).json({ success: true, data: null, message: 'Tax rule deleted.' });
});

export const listDiscounts = asyncHandler(async (req, res) => {
  const { page, limit, search, isActive } = req.validatedQuery;
  const where = { ...activeFilter(isActive), ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.discount.findMany({ where, include: { product: { select: { id: true, name: true } } }, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.discount.count({ where }),
  ]);
  return sendList(res, items, total, page, limit, 'Discounts loaded.');
});

async function validateDiscountTarget(data) {
  if (data.appliesTo === 'PRODUCT' && !data.productId) throw new ApiError(400, 'Choose a product for a product discount.');
  if (data.appliesTo === 'SUBSCRIPTION' && data.productId) throw new ApiError(400, 'Subscription discounts cannot target a product.');
  if (data.productId && !await prisma.product.findUnique({ where: { id: data.productId }, select: { id: true } })) throw new ApiError(404, 'Discount target product not found.');
}

export const createDiscount = asyncHandler(async (req, res) => {
  await validateDiscountTarget(req.body);
  const discount = await prisma.discount.create({ data: req.body });
  await writeAuditLog(prisma, { userId: req.user.id, action: 'DISCOUNT_CREATED', entity: 'Discount', entityId: discount.id });
  return res.status(201).json({ success: true, data: { discount }, message: 'Discount created.' });
});

export const updateDiscount = asyncHandler(async (req, res) => {
  const existing = await prisma.discount.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ApiError(404, 'Discount not found.');
  const data = { ...existing, ...req.body };
  if (data.type === 'PERCENTAGE' && Number(data.value) > 100) throw new ApiError(400, 'Percentage discounts cannot exceed 100%.');
  if (data.startDate && data.endDate && data.endDate < data.startDate) throw new ApiError(400, 'End date must be on or after the start date.');
  await validateDiscountTarget(data);
  const discount = await prisma.discount.update({ where: { id: existing.id }, data: req.body });
  await writeAuditLog(prisma, { userId: req.user.id, action: 'DISCOUNT_UPDATED', entity: 'Discount', entityId: discount.id });
  return res.status(200).json({ success: true, data: { discount }, message: 'Discount updated.' });
});

export const deleteDiscount = asyncHandler(async (req, res) => {
  try { await prisma.discount.delete({ where: { id: req.params.id } }); } catch (error) {
    if (error.code === 'P2025') throw new ApiError(404, 'Discount not found.');
    mapConstraintError(error, 'Discount');
  }
  await writeAuditLog(prisma, { userId: req.user.id, action: 'DISCOUNT_DELETED', entity: 'Discount', entityId: req.params.id });
  return res.status(200).json({ success: true, data: null, message: 'Discount deleted.' });
});

export const listTemplates = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.validatedQuery;
  const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};
  const [items, total] = await prisma.$transaction([
    prisma.quotationTemplate.findMany({ where, include: { plan: true, lines: { include: { product: true, variant: true } } }, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.quotationTemplate.count({ where }),
  ]);
  return sendList(res, items, total, page, limit, 'Quotation templates loaded.');
});

async function validateTemplate(data) {
  if (data.planId && !await prisma.plan.findUnique({ where: { id: data.planId }, select: { id: true } })) throw new ApiError(404, 'Template plan not found.');
  for (const line of data.lines || []) {
    const product = await prisma.product.findUnique({ where: { id: line.productId }, select: { id: true, isActive: true } });
    if (!product || !product.isActive) throw new ApiError(400, 'Every template line must use an active product.');
    if (line.variantId && !await prisma.productVariant.findFirst({ where: { id: line.variantId, productId: line.productId }, select: { id: true } })) throw new ApiError(400, 'A template variant does not belong to its selected product.');
  }
}

export const createTemplate = asyncHandler(async (req, res) => {
  await validateTemplate(req.body);
  const template = await prisma.quotationTemplate.create({ data: { name: req.body.name, validityDays: req.body.validityDays, planId: req.body.planId, lines: { create: req.body.lines } }, include: { plan: true, lines: { include: { product: true, variant: true } } } });
  await writeAuditLog(prisma, { userId: req.user.id, action: 'TEMPLATE_CREATED', entity: 'QuotationTemplate', entityId: template.id });
  return res.status(201).json({ success: true, data: { template }, message: 'Quotation template created.' });
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const existing = await prisma.quotationTemplate.findUnique({ where: { id: req.params.id }, include: { lines: true } });
  if (!existing) throw new ApiError(404, 'Quotation template not found.');
  const effective = { ...existing, ...req.body, lines: req.body.lines ?? existing.lines };
  await validateTemplate(effective);
  const template = await prisma.$transaction(async (tx) => {
    if (req.body.lines) await tx.quotationTemplateLine.deleteMany({ where: { templateId: existing.id } });
    return tx.quotationTemplate.update({ where: { id: existing.id }, data: {
      name: req.body.name,
      validityDays: req.body.validityDays,
      planId: req.body.planId,
      ...(req.body.lines ? { lines: { create: req.body.lines } } : {}),
    }, include: { plan: true, lines: { include: { product: true, variant: true } } } });
  });
  await writeAuditLog(prisma, { userId: req.user.id, action: 'TEMPLATE_UPDATED', entity: 'QuotationTemplate', entityId: template.id });
  return res.status(200).json({ success: true, data: { template }, message: 'Quotation template updated.' });
});

export const deleteTemplate = asyncHandler(async (req, res) => {
  try { await prisma.quotationTemplate.delete({ where: { id: req.params.id } }); } catch (error) {
    if (error.code === 'P2025') throw new ApiError(404, 'Quotation template not found.');
    mapConstraintError(error, 'Quotation template');
  }
  await writeAuditLog(prisma, { userId: req.user.id, action: 'TEMPLATE_DELETED', entity: 'QuotationTemplate', entityId: req.params.id });
  return res.status(200).json({ success: true, data: null, message: 'Quotation template deleted.' });
});

export const listCustomers = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.validatedQuery;
  const where = search ? { OR: [
    { companyName: { contains: search, mode: 'insensitive' } },
    { user: { name: { contains: search, mode: 'insensitive' } } },
    { user: { email: { contains: search, mode: 'insensitive' } } },
  ] } : {};
  const [items, total] = await prisma.$transaction([
    prisma.customer.findMany({ where, include: { user: { select: { id: true, name: true, email: true, isActive: true } }, _count: { select: { subscriptions: true, invoices: true } } }, orderBy: { companyName: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.customer.count({ where }),
  ]);
  return sendList(res, items, total, page, limit, 'Customers loaded.');
});
