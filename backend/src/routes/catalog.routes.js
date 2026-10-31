import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireInternalUser } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import {
  createDiscount, createPlan, createProduct, createTax, createTemplate, createVariant,
  deleteDiscount, deletePlan, deleteProduct, deleteTax, deleteTemplate, deleteVariant,
  listCustomers, listDiscounts, listPlans, listProducts, listTaxes, listTemplates,
  updateDiscount, updatePlan, updateProduct, updateTax, updateTemplate, updateVariant,
} from '../controllers/catalog.controller.js';
import {
  customerListQuerySchema, discountSchema, discountUpdateSchema, idParamsSchema,
  listQuerySchema, planSchema, planUpdateSchema, productSchema, productUpdateSchema,
  taxSchema, taxUpdateSchema, templateSchema, templateUpdateSchema, variantParamsSchema,
  variantSchema,
} from '../validators/catalog.validators.js';

export const productsRouter = Router();
productsRouter.use(authenticate, requireInternalUser);
productsRouter.get('/', validate(listQuerySchema, 'query'), listProducts);
productsRouter.post('/', requireAdmin, validate(productSchema), createProduct);
productsRouter.patch('/:id', requireAdmin, validate(idParamsSchema, 'params'), validate(productUpdateSchema), updateProduct);
productsRouter.delete('/:id', requireAdmin, validate(idParamsSchema, 'params'), deleteProduct);
productsRouter.post('/:id/variants', requireAdmin, validate(idParamsSchema, 'params'), validate(variantSchema), createVariant);
productsRouter.patch('/:id/variants/:variantId', requireAdmin, validate(variantParamsSchema, 'params'), validate(variantSchema.partial()), updateVariant);
productsRouter.delete('/:id/variants/:variantId', requireAdmin, validate(variantParamsSchema, 'params'), deleteVariant);

export const plansRouter = Router();
plansRouter.use(authenticate, requireInternalUser);
plansRouter.get('/', validate(listQuerySchema, 'query'), listPlans);
plansRouter.post('/', requireAdmin, validate(planSchema), createPlan);
plansRouter.patch('/:id', requireAdmin, validate(idParamsSchema, 'params'), validate(planUpdateSchema), updatePlan);
plansRouter.delete('/:id', requireAdmin, validate(idParamsSchema, 'params'), deletePlan);

export const taxesRouter = Router();
taxesRouter.use(authenticate, requireInternalUser);
taxesRouter.get('/', validate(listQuerySchema, 'query'), listTaxes);
taxesRouter.post('/', requireAdmin, validate(taxSchema), createTax);
taxesRouter.patch('/:id', requireAdmin, validate(idParamsSchema, 'params'), validate(taxUpdateSchema), updateTax);
taxesRouter.delete('/:id', requireAdmin, validate(idParamsSchema, 'params'), deleteTax);

export const discountsRouter = Router();
discountsRouter.use(authenticate, requireInternalUser);
discountsRouter.get('/', validate(listQuerySchema, 'query'), listDiscounts);
discountsRouter.post('/', requireAdmin, validate(discountSchema), createDiscount);
discountsRouter.patch('/:id', requireAdmin, validate(idParamsSchema, 'params'), validate(discountUpdateSchema), updateDiscount);
discountsRouter.delete('/:id', requireAdmin, validate(idParamsSchema, 'params'), deleteDiscount);

export const templatesRouter = Router();
templatesRouter.use(authenticate, requireInternalUser);
templatesRouter.get('/', validate(listQuerySchema, 'query'), listTemplates);
templatesRouter.post('/', requireAdmin, validate(templateSchema), createTemplate);
templatesRouter.patch('/:id', requireAdmin, validate(idParamsSchema, 'params'), validate(templateUpdateSchema), updateTemplate);
templatesRouter.delete('/:id', requireAdmin, validate(idParamsSchema, 'params'), deleteTemplate);

export const customersRouter = Router();
customersRouter.use(authenticate, requireInternalUser);
customersRouter.get('/', validate(customerListQuerySchema, 'query'), listCustomers);
