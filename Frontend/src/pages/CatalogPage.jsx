import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { GlassCard } from '../components/ui/GlassCard.jsx';
import { Input } from '../components/ui/Input.jsx';
import { catalogApi } from '../api/catalog.js';
import { useAuthStore } from '../store/authStore.js';
import { getErrorMessage } from '../utils/errors.js';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, PackagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';

const commonActive = { key: 'isActive', label: 'Available', type: 'checkbox', defaultValue: true };
const configs = {
  products: {
    title: 'Products', description: 'Manage billable services, software, hardware, and variants.',
    list: 'products', create: 'createProduct', update: 'updateProduct', remove: 'deleteProduct',
    fields: [
      { key: 'name', label: 'Product name', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['SERVICE', 'SOFTWARE', 'HARDWARE', 'OTHER'] },
      { key: 'salesPrice', label: 'Sales price', type: 'number', min: 0, step: '0.01', required: true },
      { key: 'costPrice', label: 'Cost price', type: 'number', min: 0, step: '0.01', required: true },
      { key: 'notes', label: 'Notes', type: 'textarea' }, commonActive,
    ],
    columns: [['name', 'Product'], ['type', 'Type'], ['salesPrice', 'Sales price'], ['costPrice', 'Cost price'], ['variants', 'Variants']],
    empty: { name: '', type: 'SERVICE', salesPrice: '', costPrice: '', notes: '', isActive: true },
  },
  plans: {
    title: 'Plans', description: 'Set recurring prices, minimum quantities, availability, and lifecycle rules.',
    list: 'plans', create: 'createPlan', update: 'updatePlan', remove: 'deletePlan',
    fields: [
      { key: 'name', label: 'Plan name', required: true },
      { key: 'price', label: 'Recurring price', type: 'number', min: 0, step: '0.01', required: true },
      { key: 'billingPeriod', label: 'Billing period', type: 'select', options: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] },
      { key: 'minQuantity', label: 'Minimum total quantity', type: 'number', min: 1, step: 1, required: true },
      { key: 'startDate', label: 'Available from', type: 'date' },
      { key: 'endDate', label: 'Available until', type: 'date' },
      { key: 'autoClose', label: 'Close subscriptions at expiry', type: 'checkbox' },
      { key: 'allowCloseEarly', label: 'Allow early close', type: 'checkbox' },
      { key: 'allowPause', label: 'Allow pause', type: 'checkbox' },
      { key: 'allowRenew', label: 'Allow renew', type: 'checkbox' }, commonActive,
    ],
    columns: [['name', 'Plan'], ['price', 'Price'], ['billingPeriod', 'Period'], ['minQuantity', 'Min qty'], ['subscriptions', 'Subscriptions'], ['isActive', 'Status']],
    empty: { name: '', price: '', billingPeriod: 'MONTHLY', minQuantity: 1, startDate: '', endDate: '', autoClose: false, allowCloseEarly: true, allowPause: true, allowRenew: true, isActive: true },
  },
  taxes: {
    title: 'Taxes', description: 'Create automatic tax rules for a product or a product type.',
    list: 'taxes', create: 'createTax', update: 'updateTax', remove: 'deleteTax',
    fields: [
      { key: 'name', label: 'Tax name', required: true },
      { key: 'ratePercent', label: 'Rate (%)', type: 'number', min: 0, max: 100, step: '0.01', required: true },
      { key: 'productType', label: 'Apply to product type', type: 'select', options: ['', 'SERVICE', 'SOFTWARE', 'HARDWARE', 'OTHER'] },
      { key: 'productId', label: 'Or apply to one product', type: 'product' }, commonActive,
    ],
    columns: [['name', 'Tax'], ['ratePercent', 'Rate'], ['target', 'Applies to'], ['isActive', 'Status']],
    empty: { name: '', ratePercent: '', productType: '', productId: '', isActive: true },
  },
  discounts: {
    title: 'Discounts', description: 'Set automatic product or subscription discounts with dates and usage limits.',
    list: 'discounts', create: 'createDiscount', update: 'updateDiscount', remove: 'deleteDiscount',
    fields: [
      { key: 'name', label: 'Discount name', required: true },
      { key: 'type', label: 'Discount type', type: 'select', options: ['FIXED', 'PERCENTAGE'] },
      { key: 'value', label: 'Amount or percent', type: 'number', min: 0.01, step: '0.01', required: true },
      { key: 'appliesTo', label: 'Applies to', type: 'select', options: ['PRODUCT', 'SUBSCRIPTION'] },
      { key: 'productId', label: 'Product', type: 'product' },
      { key: 'minPurchase', label: 'Minimum purchase', type: 'number', min: 0, step: '0.01' },
      { key: 'minQuantity', label: 'Minimum quantity', type: 'number', min: 1, step: 1 },
      { key: 'startDate', label: 'Starts on', type: 'date' },
      { key: 'endDate', label: 'Ends on', type: 'date' },
      { key: 'usageLimit', label: 'Maximum uses', type: 'number', min: 1, step: 1 }, commonActive,
    ],
    columns: [['name', 'Discount'], ['type', 'Type'], ['value', 'Value'], ['appliesTo', 'Applies to'], ['product', 'Product'], ['usedCount', 'Uses'], ['isActive', 'Status']],
    empty: { name: '', type: 'PERCENTAGE', value: '', appliesTo: 'SUBSCRIPTION', productId: '', minPurchase: '', minQuantity: 1, startDate: '', endDate: '', usageLimit: '', isActive: true },
  },
  templates: {
    title: 'Quotation templates', description: 'Save repeatable plan and product bundles for faster quotations.',
    list: 'templates', create: 'createTemplate', update: 'updateTemplate', remove: 'deleteTemplate',
    fields: [
      { key: 'name', label: 'Template name', required: true },
      { key: 'planId', label: 'Plan', type: 'plan', required: true },
      { key: 'validityDays', label: 'Quote validity (days)', type: 'number', min: 1, step: 1, required: true },
    ],
    columns: [['name', 'Template'], ['plan', 'Plan'], ['validityDays', 'Valid for'], ['lineCount', 'Lines']],
    empty: { name: '', planId: '', validityDays: 14 },
  },
};

const currency = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const dateValue = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';
const activeLabel = (value) => value ? 'Active' : 'Inactive';

function recordForForm(type, item) {
  if (!item) return configs[type].empty;
  if (type === 'templates') return { name: item.name, planId: item.planId, validityDays: item.validityDays };
  return Object.fromEntries(configs[type].fields.map(({ key }) => {
    if (['startDate', 'endDate'].includes(key)) return [key, dateValue(item[key])];
    if (key === 'isActive' || key === 'autoClose' || key === 'allowCloseEarly' || key === 'allowPause' || key === 'allowRenew') return [key, item[key] ?? configs[type].empty[key]];
    return [key, item[key] ?? configs[type].empty[key] ?? ''];
  }));
}

function makePayload(type, values, lines) {
  const payload = { ...values };
  for (const key of ['startDate', 'endDate']) if (key in payload) payload[key] = payload[key] || null;
  if (type === 'products') {
    payload.salesPrice = Number(payload.salesPrice);
    payload.costPrice = Number(payload.costPrice);
    payload.notes = payload.notes || null;
  }
  if (type === 'plans') {
    payload.price = Number(payload.price);
    payload.minQuantity = Number(payload.minQuantity);
  }
  if (type === 'taxes') {
    payload.ratePercent = Number(payload.ratePercent);
    payload.productId = payload.productId || null;
    payload.productType = payload.productType || null;
  }
  if (type === 'discounts') {
    payload.value = Number(payload.value);
    payload.minPurchase = payload.minPurchase === '' ? null : Number(payload.minPurchase);
    payload.minQuantity = Number(payload.minQuantity || 1);
    payload.usageLimit = payload.usageLimit === '' ? null : Number(payload.usageLimit);
    payload.productId = payload.appliesTo === 'PRODUCT' ? payload.productId || null : null;
  }
  if (type === 'templates') {
    payload.validityDays = Number(payload.validityDays);
    payload.lines = lines.map((line) => ({ productId: line.productId, variantId: line.variantId || null, quantity: Number(line.quantity) }));
  }
  return payload;
}

function displayColumn(type, item, key) {
  if (key === 'salesPrice' || key === 'costPrice' || key === 'price') return currency(item[key]);
  if (key === 'value') return item.type === 'PERCENTAGE' ? `${item.value}%` : currency(item.value);
  if (key === 'ratePercent') return `${item.ratePercent}%`;
  if (key === 'isActive') return <Badge variant={item.isActive ? 'success' : 'muted'}>{activeLabel(item.isActive)}</Badge>;
  if (key === 'variants') return `${item.variants?.length || 0} variant${item.variants?.length === 1 ? '' : 's'}`;
  if (key === 'subscriptions') return item._count?.subscriptions || 0;
  if (key === 'target') return item.product ? item.product.name : item.productType || 'All products';
  if (key === 'product') return item.product?.name || '—';
  if (key === 'plan') return item.plan?.name || '—';
  if (key === 'lineCount') return item.lines?.length || 0;
  if (key === 'usedCount') return item.usageLimit ? `${item.usedCount} / ${item.usageLimit}` : `${item.usedCount} / ∞`;
  return item[key] || '—';
}

function Field({ field, value, onChange, refs }) {
  const inputId = `catalog-${field.key}`;
  if (field.type === 'checkbox') return <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-burgundy/10 bg-white/65 px-4 text-sm font-semibold text-ink">
    <input id={inputId} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(field.key, event.target.checked)} className="h-4 w-4 accent-burgundy" />{field.label}
  </label>;
  if (field.type === 'textarea') return <label htmlFor={inputId} className="block text-sm font-semibold text-ink">{field.label}<textarea id={inputId} value={value ?? ''} onChange={(event) => onChange(field.key, event.target.value)} rows="3" className="mt-2 w-full rounded-2xl border border-burgundy/15 bg-white/75 px-4 py-3 text-sm outline-none focus:border-burgundy/50 focus:ring-4 focus:ring-burgundy/10" /></label>;
  if (field.type === 'select' || field.type === 'product' || field.type === 'plan') {
    const options = field.type === 'product' ? refs.products.map((product) => [product.id, product.name])
      : field.type === 'plan' ? refs.plans.map((plan) => [plan.id, plan.name])
        : field.options.map((option) => [option, option || 'No product type']);
    return <label htmlFor={inputId} className="block text-sm font-semibold text-ink">{field.label}<select id={inputId} required={field.required} value={value ?? ''} onChange={(event) => onChange(field.key, event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-burgundy/15 bg-white/75 px-4 py-3 text-sm outline-none focus:border-burgundy/50 focus:ring-4 focus:ring-burgundy/10">
      <option value="">Select…</option>{options.map(([optionValue, label]) => <option key={optionValue || 'none'} value={optionValue}>{label}</option>)}
    </select></label>;
  }
  return <Input id={inputId} label={field.label} required={field.required} type={field.type || 'text'} value={value ?? ''} min={field.min} max={field.max} step={field.step} onChange={(event) => onChange(field.key, event.target.value)} />;
}

export function CatalogPage({ type }) {
  const config = configs[type];
  const user = useAuthStore((state) => state.user);
  const isAdmin = user.role === 'ADMIN';
  const [items, setItems] = useState([]);
  const [refs, setRefs] = useState({ products: [], plans: [] });
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(config.empty);
  const [templateLines, setTemplateLines] = useState([{ productId: '', variantId: '', quantity: 1 }]);
  const [variantTarget, setVariantTarget] = useState('');
  const [variantDraft, setVariantDraft] = useState({ id: '', attribute: '', value: '', extraPrice: '' });
  const [variantSaving, setVariantSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await catalogApi[config.list]({ page, limit: 20, ...(search ? { search } : {}) });
      setItems(data.data);
      setMeta(data.meta);
    } catch (error) { toast.error(getErrorMessage(error, `Could not load ${config.title.toLowerCase()}.`)); }
    finally { setLoading(false); }
  }, [config, page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setPage(1); setSearch(searchInput.trim()); }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    setEditing(null);
    setForm(configs[type].empty);
    setTemplateLines([{ productId: '', variantId: '', quantity: 1 }]);
    setVariantTarget('');
    let active = true;
    Promise.all([catalogApi.products({ page: 1, limit: 100 }), catalogApi.plans({ page: 1, limit: 100 })])
      .then(([products, plans]) => { if (active) setRefs({ products: products.data.data, plans: plans.data.data }); })
      .catch(() => {});
    return () => { active = false; };
  }, [type]);

  const titleBadge = useMemo(() => type === 'templates' ? 'QUOTATIONS' : 'CATALOG', [type]);
  function resetForm() { setEditing(null); setForm(config.empty); setTemplateLines([{ productId: '', variantId: '', quantity: 1 }]); }
  function startEdit(item) {
    setEditing(item);
    setForm(recordForForm(type, item));
    if (type === 'templates') setTemplateLines(item.lines.map((line) => ({ productId: line.productId, variantId: line.variantId || '', quantity: line.quantity })));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function submit(event) {
    event.preventDefault();
    if (type === 'templates' && templateLines.some((line) => !line.productId || Number(line.quantity) < 1)) { toast.error('Add a product and quantity to each template line.'); return; }
    setSaving(true);
    try {
      const payload = makePayload(type, form, templateLines);
      if (editing) await catalogApi[config.update](editing.id, payload);
      else await catalogApi[config.create](payload);
      toast.success(`${config.title.slice(0, -1) || config.title} ${editing ? 'updated' : 'created'}.`);
      resetForm();
      await load();
      if (type === 'products' || type === 'plans') {
        const [products, plans] = await Promise.all([catalogApi.products({ page: 1, limit: 100 }), catalogApi.plans({ page: 1, limit: 100 })]);
        setRefs({ products: products.data.data, plans: plans.data.data });
      }
    } catch (error) { toast.error(getErrorMessage(error, `Could not save ${config.title.toLowerCase()}.`)); }
    finally { setSaving(false); }
  }
  async function remove(item) {
    if (!window.confirm(`Delete “${item.name}”? This may be blocked if it is already in use.`)) return;
    try { await catalogApi[config.remove](item.id); toast.success('Record deleted.'); await load(); }
    catch (error) { toast.error(getErrorMessage(error, 'Could not delete the record.')); }
  }
  function variantOptions(productId) { return refs.products.find((product) => product.id === productId)?.variants || []; }
  async function saveVariant(event) {
    event.preventDefault();
    setVariantSaving(true);
    try {
      const payload = { attribute: variantDraft.attribute, value: variantDraft.value, extraPrice: Number(variantDraft.extraPrice || 0) };
      if (variantDraft.id) await catalogApi.updateVariant(variantTarget, variantDraft.id, payload);
      else await catalogApi.createVariant(variantTarget, payload);
      toast.success(`Variant ${variantDraft.id ? 'updated' : 'added'}.`);
      setVariantDraft({ id: '', attribute: '', value: '', extraPrice: '' });
      await load();
      const { data } = await catalogApi.products({ page: 1, limit: 100 });
      setRefs((old) => ({ ...old, products: data.data }));
    } catch (error) { toast.error(getErrorMessage(error, 'Could not save the variant.')); }
    finally { setVariantSaving(false); }
  }
  async function removeVariant(product, variant) {
    try { await catalogApi.deleteVariant(product.id, variant.id); toast.success('Variant deleted.'); await load(); }
    catch (error) { toast.error(getErrorMessage(error, 'Could not delete the variant.')); }
  }

  return <div className="workspace-page mx-auto max-w-7xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><Badge variant="accent">{titleBadge}</Badge><h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">{config.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">{config.description}</p></div>
      <div className="inline-flex items-center gap-2 rounded-full border border-burgundy/10 bg-white/55 px-4 py-2 text-sm font-semibold text-burgundy">{isAdmin ? 'Admin managed' : 'Read only access'}</div>
    </div>

    <div className={isAdmin ? 'grid items-start gap-5 xl:grid-cols-[minmax(300px,380px)_1fr]' : 'space-y-5'}>
      {isAdmin && <GlassCard className="p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-ink">{editing ? 'Edit record' : 'Add a record'}</h2><p className="mt-1 text-xs text-ink/60">Changes are applied to new subscriptions and invoices.</p></div>{editing && <Button variant="ghost" className="min-h-9 px-3" onClick={resetForm} aria-label="Cancel edit"><X size={16} /></Button>}</div>
        <form className="space-y-4" onSubmit={submit}>
          {config.fields.map((field) => <Field key={field.key} field={field} value={form[field.key]} refs={refs} onChange={(key, value) => setForm((old) => ({ ...old, [key]: value, ...(type === 'taxes' && value ? key === 'productId' ? { productType: '' } : key === 'productType' ? { productId: '' } : {} : {}) }))} />)}
          {type === 'templates' && <div className="space-y-3 rounded-2xl border border-burgundy/10 bg-cream-soft/60 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-bold text-ink">Product lines</p><Button type="button" variant="secondary" className="min-h-8 px-3 text-xs" onClick={() => setTemplateLines((old) => [...old, { productId: '', variantId: '', quantity: 1 }])}><Plus size={14} /> Add line</Button></div>
            {templateLines.map((line, index) => <div key={index} className="grid grid-cols-[1fr_78px_40px] gap-2">
              <select aria-label={`Line ${index + 1} product`} value={line.productId} onChange={(event) => setTemplateLines((old) => old.map((item, at) => at === index ? { ...item, productId: event.target.value, variantId: '' } : item))} className="min-h-10 min-w-0 rounded-xl border border-burgundy/15 bg-white px-3 text-xs"><option value="">Product…</option>{refs.products.filter((product) => product.isActive).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
              <input aria-label={`Line ${index + 1} quantity`} type="number" min="1" value={line.quantity} onChange={(event) => setTemplateLines((old) => old.map((item, at) => at === index ? { ...item, quantity: event.target.value } : item))} className="min-h-10 rounded-xl border border-burgundy/15 bg-white px-3 text-xs" />
              <Button type="button" variant="ghost" className="min-h-10 px-2" aria-label={`Remove line ${index + 1}`} onClick={() => setTemplateLines((old) => old.length > 1 ? old.filter((_, at) => at !== index) : old)}><X size={15} /></Button>
              {line.productId && variantOptions(line.productId).length > 0 && <select aria-label={`Line ${index + 1} variant`} value={line.variantId} onChange={(event) => setTemplateLines((old) => old.map((item, at) => at === index ? { ...item, variantId: event.target.value } : item))} className="col-span-3 min-h-9 rounded-xl border border-burgundy/15 bg-white px-3 text-xs"><option value="">No variant</option>{variantOptions(line.productId).map((variant) => <option key={variant.id} value={variant.id}>{variant.attribute}: {variant.value} (+{currency(variant.extraPrice)})</option>)}</select>}
            </div>)}
          </div>}
          <Button type="submit" disabled={saving} className="w-full"><PackagePlus size={16} />{saving ? 'Saving…' : editing ? 'Save changes' : `Create ${config.title.slice(0, -1).toLowerCase()}`}</Button>
        </form>
      </GlassCard>}

      <div className="space-y-5">
        <GlassCard className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-burgundy/10 p-5 sm:p-6">
            <div><h2 className="font-display text-lg font-bold text-ink">{config.title} list</h2><p className="mt-1 text-sm text-ink/60">{meta.total} record{meta.total === 1 ? '' : 's'}</p></div>
            <div className="w-full sm:w-72"><Input aria-label={`Search ${config.title}`} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} className="min-h-10 py-2 pl-10" /><Search size={16} className="pointer-events-none -mt-7 ml-4 text-ink/45" aria-hidden="true" /></div>
          </div>
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-cream-soft/75 text-xs uppercase tracking-wide text-burgundy/70"><tr>{config.columns.map(([, label]) => <th key={label} className="px-5 py-3 font-bold">{label}</th>)}{isAdmin && <th className="px-5 py-3 text-right font-bold">Actions</th>}</tr></thead>
            <tbody className="divide-y divide-burgundy/5">
              {loading && <tr><td colSpan={config.columns.length + (isAdmin ? 1 : 0)} className="px-5 py-10 text-center text-ink/60">Loading {config.title.toLowerCase()}…</td></tr>}
              {!loading && items.map((item) => <tr key={item.id} className="hover:bg-cream-soft/45">{config.columns.map(([key]) => <td key={key} className="px-5 py-4 align-top text-ink/75">{displayColumn(type, item, key)}</td>)}{isAdmin && <td className="px-5 py-4 text-right"><div className="flex justify-end gap-1"><Button variant="ghost" className="min-h-9 px-3" aria-label={`Edit ${item.name}`} onClick={() => startEdit(item)}><Pencil size={15} /></Button><Button variant="ghost" className="min-h-9 px-3" aria-label={`Delete ${item.name}`} onClick={() => void remove(item)}><Trash2 size={15} /></Button></div></td>}</tr>)}
              {!loading && items.length === 0 && <tr><td colSpan={config.columns.length + (isAdmin ? 1 : 0)} className="px-5 py-12 text-center"><p className="font-semibold text-ink">No records yet</p><p className="mt-1 text-sm text-ink/60">{isAdmin ? 'Use the form to create the first record.' : 'There are no records to show.'}</p></td></tr>}
            </tbody></table></div>
          <div className="flex flex-col gap-3 border-t border-burgundy/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="text-xs font-medium text-ink/60">Page {meta.page} of {Math.max(meta.pages, 1)}</p><div className="flex gap-2"><Button variant="secondary" className="min-h-10 flex-1 justify-center px-3 sm:min-h-9 sm:flex-none" disabled={page <= 1 || loading} onClick={() => setPage((old) => Math.max(1, old - 1))}><ChevronLeft size={15} /> Previous</Button><Button variant="secondary" className="min-h-10 flex-1 justify-center px-3 sm:min-h-9 sm:flex-none" disabled={page >= meta.pages || loading} onClick={() => setPage((old) => old + 1)}>Next <ChevronRight size={15} /></Button></div></div>
        </GlassCard>

        {type === 'products' && items.map((product) => <GlassCard key={product.id} className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display font-bold text-ink">{product.name} variants</h3><p className="mt-1 text-xs text-ink/60">Final unit price adds variant extra price to sales price.</p></div>{isAdmin && <Button variant="secondary" className="min-h-9 px-3" onClick={() => { setVariantTarget(product.id); setVariantDraft({ id: '', attribute: '', value: '', extraPrice: '' }); }}><Plus size={15} /> Add variant</Button>}</div>
          {product.variants?.length ? <div className="mt-4 flex flex-wrap gap-2">{product.variants.map((variant) => <span key={variant.id} className="inline-flex items-center gap-2 rounded-full border border-burgundy/10 bg-white/65 px-3 py-2 text-xs text-ink"><span>{variant.attribute}: <b>{variant.value}</b> (+{currency(variant.extraPrice)})</span>{isAdmin && <><button type="button" className="rounded-full p-1 text-burgundy hover:bg-cream-deep/50" aria-label={`Edit variant ${variant.value}`} onClick={() => { setVariantTarget(product.id); setVariantDraft({ id: variant.id, attribute: variant.attribute, value: variant.value, extraPrice: String(variant.extraPrice) }); }}><Pencil size={12} /></button><button type="button" className="rounded-full p-1 text-burgundy hover:bg-cream-deep/50" aria-label={`Delete variant ${variant.value}`} onClick={() => void removeVariant(product, variant)}><Trash2 size={12} /></button></>}</span>)}</div> : <p className="mt-4 text-sm text-ink/55">No variants added.</p>}
          {isAdmin && variantTarget === product.id && <form onSubmit={saveVariant} className="mt-4 grid gap-3 rounded-2xl bg-cream-soft/65 p-4 sm:grid-cols-[1fr_1fr_140px_auto_auto]">
            <Input label="Attribute" value={variantDraft.attribute} onChange={(event) => setVariantDraft((old) => ({ ...old, attribute: event.target.value }))} required placeholder="Brand" />
            <Input label="Value" value={variantDraft.value} onChange={(event) => setVariantDraft((old) => ({ ...old, value: event.target.value }))} required placeholder="Odoo" />
            <Input label="Extra price" type="number" min="0" step="0.01" value={variantDraft.extraPrice} onChange={(event) => setVariantDraft((old) => ({ ...old, extraPrice: event.target.value }))} required />
            <div className="flex items-end"><Button type="submit" disabled={variantSaving} className="min-h-10 px-4">{variantSaving ? 'Saving…' : variantDraft.id ? 'Update' : 'Add'}</Button></div>
            <div className="flex items-end"><Button type="button" variant="ghost" className="min-h-10 px-3" onClick={() => { setVariantTarget(''); setVariantDraft({ id: '', attribute: '', value: '', extraPrice: '' }); }}><X size={15} /> Close</Button></div>
          </form>}
        </GlassCard>)}
      </div>
    </div>
  </div>;
}
