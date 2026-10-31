import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { GlassCard } from '../components/ui/GlassCard.jsx';
import { Input } from '../components/ui/Input.jsx';
import { catalogApi } from '../api/catalog.js';
import { invoicesApi } from '../api/invoices.js';
import { subscriptionsApi } from '../api/subscriptions.js';
import { useAuthStore } from '../store/authStore.js';
import { getErrorMessage } from '../utils/errors.js';
import toast from 'react-hot-toast';
import { Check, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardList, Eye, FilePlus2, Pause, Pencil, Play, Plus, RotateCcw, Send, X } from 'lucide-react';

const currency = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const fmtDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
const dateInput = (value) => value ? new Date(value).toISOString().slice(0, 10) : '';
const stages = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'];
const statusText = (status) => ({ DRAFT: 'Draft', QUOTATION: 'Quotation', CONFIRMED: 'Confirmed', ACTIVE: 'Active', CLOSED: 'Closed' }[status] || status);
const statusVariant = (status) => status === 'ACTIVE' ? 'success' : status === 'CLOSED' ? 'muted' : status === 'DRAFT' ? 'muted' : 'accent';
const blankLine = () => ({ productId: '', variantId: '', taxId: '', quantity: 1 });
const initialForm = () => ({ customerId: '', planId: '', startDate: new Date().toISOString().slice(0, 10), expiryDate: '', quotationValidUntil: '', paymentTerms: '', lines: [blankLine()] });

function SelectField({ label, value, onChange, children, required = false }) {
  return <label className="block text-sm font-semibold text-ink">{label}<select required={required} value={value ?? ''} onChange={onChange} className="mt-2 min-h-12 w-full rounded-2xl border border-burgundy/15 bg-white/75 px-4 py-3 text-sm outline-none focus:border-burgundy/50 focus:ring-4 focus:ring-burgundy/10">{children}</select></label>;
}

export function SubscriptionsPage() {
  const user = useAuthStore((state) => state.user);
  const internal = user.role !== 'CUSTOMER';
  const admin = user.role === 'ADMIN';
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [refs, setRefs] = useState({ customers: [], plans: [], products: [], taxes: [], templates: [] });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [selected, setSelected] = useState(null);
  const [templateForm, setTemplateForm] = useState({ templateId: '', customerId: '', startDate: new Date().toISOString().slice(0, 10), paymentTerms: '' });
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await subscriptionsApi.list({ page, limit: 20, ...(statusFilter ? { status: statusFilter } : {}), ...(search ? { search } : {}) });
      setItems(data.data);
      setMeta(data.meta);
      if (selected) {
        const refreshed = data.data.find((item) => item.id === selected.id);
        if (refreshed) setSelected(refreshed);
      }
    } catch (error) { toast.error(getErrorMessage(error, 'Could not load subscriptions.')); }
    finally { setLoading(false); }
  }, [page, statusFilter, search, selected?.id]);

  useEffect(() => { const timer = window.setTimeout(() => { setPage(1); setSearch(searchInput.trim()); }, 250); return () => window.clearTimeout(timer); }, [searchInput]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!internal) return;
    let active = true;
    async function loadOptions() {
      try {
        // Keep reference lookups sequential: the local PGlite development server is configured
        // with a small connection limit, and the list + notification requests are already active.
        const customers = await catalogApi.customers({ page: 1, limit: 100 });
        const plans = await catalogApi.plans({ page: 1, limit: 100 });
        const products = await catalogApi.products({ page: 1, limit: 100 });
        const taxes = await catalogApi.taxes({ page: 1, limit: 100 });
        const templates = await catalogApi.templates({ page: 1, limit: 100 });
        if (active) setRefs({ customers: customers.data.data, plans: plans.data.data, products: products.data.data, taxes: taxes.data.data, templates: templates.data.data });
      } catch (error) {
        if (active) toast.error(getErrorMessage(error, 'Could not load subscription options.'));
      }
    }
    void loadOptions();
    return () => { active = false; };
  }, [internal]);

  const productsById = useMemo(() => Object.fromEntries(refs.products.map((item) => [item.id, item])), [refs.products]);
  function resetForm() { setEditing(null); setForm(initialForm()); }
  function startEdit(item) {
    setEditing(item);
    setForm({ customerId: item.customerId, planId: item.planId, startDate: dateInput(item.startDate), expiryDate: dateInput(item.expiryDate), quotationValidUntil: dateInput(item.quotationValidUntil), paymentTerms: item.paymentTerms || '', lines: item.lines.map(({ productId, variantId, taxId, quantity }) => ({ productId, variantId: variantId || '', taxId: taxId || '', quantity })) });
    setSelected(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function save(event) {
    event.preventDefault();
    if (!form.lines.length || form.lines.some((line) => !line.productId || Number(line.quantity) < 1)) { toast.error('Choose a product and positive quantity for each line.'); return; }
    setSaving(true);
    try {
      const body = { ...form, startDate: new Date(form.startDate), expiryDate: form.expiryDate ? new Date(form.expiryDate) : null, quotationValidUntil: form.quotationValidUntil ? new Date(form.quotationValidUntil) : null, lines: form.lines.map((line) => ({ ...line, variantId: line.variantId || null, taxId: line.taxId || null, quantity: Number(line.quantity) })) };
      if (editing) await subscriptionsApi.update(editing.id, body);
      else await subscriptionsApi.create(body);
      toast.success(editing ? 'Subscription draft updated.' : 'Draft subscription created.');
      resetForm();
      await load();
    } catch (error) { toast.error(getErrorMessage(error, 'Could not save the subscription.')); }
    finally { setSaving(false); }
  }
  async function createFromTemplate(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await subscriptionsApi.createFromTemplate(templateForm.templateId, { customerId: templateForm.customerId, startDate: new Date(templateForm.startDate), paymentTerms: templateForm.paymentTerms || null });
      toast.success('Draft subscription created from template.');
      setTemplateForm({ templateId: '', customerId: '', startDate: new Date().toISOString().slice(0, 10), paymentTerms: '' });
      await load();
    } catch (error) { toast.error(getErrorMessage(error, 'Could not create from this template.')); }
    finally { setSaving(false); }
  }
  async function runAction(item, action, confirmMessage) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBusyId(item.id);
    try {
      if (action === 'quotation') await subscriptionsApi.quotation(item.id);
      if (action === 'confirm') await subscriptionsApi.confirm(item.id);
      if (action === 'activate') await subscriptionsApi.activate(item.id);
      if (action === 'pause') await subscriptionsApi.pause(item.id);
      if (action === 'resume') await subscriptionsApi.resume(item.id);
      if (action === 'renew') await subscriptionsApi.renew(item.id, 1);
      if (action === 'close') await subscriptionsApi.close(item.id);
      if (action === 'delete') { await subscriptionsApi.delete(item.id); toast.success('Draft subscription deleted.'); }
      else toast.success(`${action[0].toUpperCase()}${action.slice(1)} completed.`);
      await load();
    } catch (error) { toast.error(getErrorMessage(error, `Could not ${action} this subscription.`)); }
    finally { setBusyId(''); }
  }
  async function generateNow(item) {
    setBusyId(item.id);
    try { const { data } = await invoicesApi.generate(item.id); toast.success(data.message || 'Invoice generated.'); }
    catch (error) { toast.error(getErrorMessage(error, 'Could not generate an invoice.')); }
    finally { setBusyId(''); }
  }
  async function removeDraft(item) { await runAction(item, 'delete', `Delete draft ${item.number}?`); }
  function onLineChange(index, key, value) { setForm((old) => ({ ...old, lines: old.lines.map((line, at) => at === index ? { ...line, [key]: value, ...(key === 'productId' ? { variantId: '' } : {}) } : line) })); }
  function stepIndex(status) { return Math.max(0, stages.indexOf(status)); }

  return <div className="workspace-page mx-auto max-w-7xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><Badge variant="accent">RECURRING REVENUE</Badge><h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">Subscriptions</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">Move each agreement through its lifecycle, keep plan rules enforced, and see the next billing date.</p></div>{internal && <div className="rounded-full border border-burgundy/10 bg-white/55 px-4 py-2 text-sm font-semibold text-burgundy">{meta.total} record{meta.total === 1 ? '' : 's'}</div>}</div>

    {internal && <div className="grid items-start gap-5 xl:grid-cols-2">
      <GlassCard className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-ink">{editing ? `Edit ${editing.number}` : 'Create a draft'}</h2><p className="mt-1 text-xs text-ink/60">Prices are taken from the catalog and variants.</p></div>{editing && <Button variant="ghost" className="min-h-9 px-3" onClick={resetForm}><X size={15} /> Cancel</Button>}</div>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Customer" required value={form.customerId} onChange={(event) => setForm((old) => ({ ...old, customerId: event.target.value }))}><option value="">Select customer…</option>{refs.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName} · {customer.user.email}</option>)}</SelectField>
            <SelectField label="Plan" required value={form.planId} onChange={(event) => setForm((old) => ({ ...old, planId: event.target.value }))}><option value="">Select plan…</option>{refs.plans.filter((plan) => plan.isActive).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {currency(plan.price)}/{plan.billingPeriod.toLowerCase()}</option>)}</SelectField>
            <Input label="Start date" type="date" required value={form.startDate} onChange={(event) => setForm((old) => ({ ...old, startDate: event.target.value }))} />
            <Input label="Expiry date (optional)" type="date" value={form.expiryDate} onChange={(event) => setForm((old) => ({ ...old, expiryDate: event.target.value }))} />
            <Input label="Quotation valid until" type="date" value={form.quotationValidUntil} onChange={(event) => setForm((old) => ({ ...old, quotationValidUntil: event.target.value }))} />
            <Input label="Payment terms" value={form.paymentTerms} onChange={(event) => setForm((old) => ({ ...old, paymentTerms: event.target.value }))} placeholder="Net 14" />
          </div>
          <div className="space-y-3 rounded-2xl border border-burgundy/10 bg-cream-soft/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold text-ink">Subscription lines</h3><p className="mt-1 text-xs text-ink/60">The plan minimum quantity applies to the sum of line quantities.</p></div><Button type="button" variant="secondary" className="min-h-9 px-3" onClick={() => setForm((old) => ({ ...old, lines: [...old.lines, blankLine()] }))}><Plus size={15} /> Add line</Button></div>
            {form.lines.map((line, index) => {
              const product = productsById[line.productId];
              const variant = product?.variants?.find((item) => item.id === line.variantId);
              const unit = Number(product?.salesPrice || 0) + Number(variant?.extraPrice || 0);
              return <div key={index} className="grid gap-2 rounded-2xl bg-white/60 p-3 md:grid-cols-[1.3fr_1.2fr_1fr_88px_42px]">
                <SelectField label="Product" required value={line.productId} onChange={(event) => onLineChange(index, 'productId', event.target.value)}><option value="">Choose…</option>{refs.products.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name} · {currency(item.salesPrice)}</option>)}</SelectField>
                <SelectField label="Variant" value={line.variantId} onChange={(event) => onLineChange(index, 'variantId', event.target.value)}><option value="">No variant</option>{product?.variants?.map((item) => <option key={item.id} value={item.id}>{item.attribute}: {item.value} (+{currency(item.extraPrice)})</option>)}</SelectField>
                <SelectField label="Tax rule" value={line.taxId} onChange={(event) => onLineChange(index, 'taxId', event.target.value)}><option value="">Automatic</option>{refs.taxes.filter((tax) => tax.isActive).map((tax) => <option key={tax.id} value={tax.id}>{tax.name} · {tax.ratePercent}%</option>)}</SelectField>
                <label className="block text-sm font-semibold text-ink">Qty<input type="number" min="1" step="1" required value={line.quantity} onChange={(event) => onLineChange(index, 'quantity', event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-burgundy/15 bg-white/75 px-3 text-sm outline-none focus:ring-4 focus:ring-burgundy/10" /><span className="mt-1 block text-[10px] font-normal text-ink/55">{currency(unit)} each</span></label>
                <div className="flex items-end"><Button type="button" variant="ghost" className="min-h-11 w-full px-2" aria-label={`Remove line ${index + 1}`} disabled={form.lines.length === 1} onClick={() => setForm((old) => ({ ...old, lines: old.lines.filter((_, at) => at !== index) }))}><X size={16} /></Button></div>
              </div>;
            })}
          </div>
          <Button type="submit" className="w-full" disabled={saving || !refs.customers.length || !refs.plans.length}><Plus size={16} />{saving ? 'Saving…' : editing ? 'Save draft' : 'Create draft subscription'}</Button>
        </form>
      </GlassCard>

      <GlassCard className="p-5 sm:p-6"><div className="mb-5"><Badge variant="muted">TEMPLATE</Badge><h2 className="mt-3 font-display text-lg font-bold text-ink">Start from a quotation template</h2><p className="mt-1 text-xs text-ink/60">The template fills in the plan, product lines, and quote validity.</p></div>
        <form onSubmit={createFromTemplate} className="space-y-4">
          <SelectField label="Quotation template" required value={templateForm.templateId} onChange={(event) => setTemplateForm((old) => ({ ...old, templateId: event.target.value }))}><option value="">Choose a template…</option>{refs.templates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.plan.name}</option>)}</SelectField>
          <SelectField label="Customer" required value={templateForm.customerId} onChange={(event) => setTemplateForm((old) => ({ ...old, customerId: event.target.value }))}><option value="">Choose a customer…</option>{refs.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName} · {customer.user.email}</option>)}</SelectField>
          <div className="grid gap-4 sm:grid-cols-2"><Input label="Start date" type="date" required value={templateForm.startDate} onChange={(event) => setTemplateForm((old) => ({ ...old, startDate: event.target.value }))} /><Input label="Payment terms" value={templateForm.paymentTerms} onChange={(event) => setTemplateForm((old) => ({ ...old, paymentTerms: event.target.value }))} placeholder="Net 14" /></div>
          {templateForm.templateId && (() => { const template = refs.templates.find((item) => item.id === templateForm.templateId); return template ? <div className="rounded-2xl bg-cream-soft/70 p-4 text-sm"><p className="font-semibold text-ink">{template.plan.name} · {currency(template.plan.price)} per {template.plan.billingPeriod.toLowerCase()}</p><p className="mt-1 text-xs text-ink/60">Quote valid for {template.validityDays} days</p><ul className="mt-3 space-y-1 text-xs text-ink/70">{template.lines.map((line) => <li key={line.id}>{line.quantity} × {line.product.name}{line.variant ? ` · ${line.variant.attribute}: ${line.variant.value}` : ''}</li>)}</ul></div> : null; })()}
          <Button type="submit" className="w-full" disabled={saving || !refs.templates.length || !refs.customers.length}><FilePlus2 size={16} />Create from template</Button>
        </form>
      </GlassCard>
    </div>}

    <GlassCard className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-burgundy/10 p-5 sm:p-6">
        <div><h2 className="font-display text-lg font-bold text-ink">Subscription register</h2><p className="mt-1 text-sm text-ink/60">Page {meta.page} of {Math.max(meta.pages, 1)} · {meta.total} records</p></div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto"><div className="w-full sm:w-64"><Input aria-label="Search subscriptions" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search number, customer, plan" className="min-h-10 py-2 pl-10" /><span className="pointer-events-none -mt-7 ml-4 block text-ink/45"><ClipboardList size={16} /></span></div><select aria-label="Filter subscription status" value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }} className="min-h-10 rounded-full border border-burgundy/15 bg-white/75 px-4 text-sm"><option value="">All statuses</option>{stages.map((stage) => <option key={stage} value={stage}>{statusText(stage)}</option>)}</select></div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-cream-soft/75 text-xs uppercase tracking-wide text-burgundy/70"><tr><th className="px-5 py-3">Subscription</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Start / expiry</th><th className="px-5 py-3">Next billing</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-burgundy/5">
          {loading && <tr><td colSpan="7" className="px-5 py-12 text-center text-ink/60">Loading subscriptions…</td></tr>}
          {!loading && items.map((item) => <tr key={item.id} className="align-top hover:bg-cream-soft/45">
            <td className="px-5 py-4"><p className="font-bold text-ink">{item.number}</p><p className="mt-1 text-xs text-ink/55">{item.lines.reduce((sum, line) => sum + line.quantity, 0)} item(s)</p></td>
            <td className="px-5 py-4"><p className="font-semibold text-ink">{item.customer.companyName}</p><p className="mt-1 text-xs text-ink/55">{item.customer.user.email}</p></td>
            <td className="px-5 py-4"><p className="font-semibold text-ink">{item.plan.name}</p><p className="mt-1 text-xs text-ink/55">{currency(item.plan.price)} / {item.plan.billingPeriod.toLowerCase()}</p></td>
            <td className="px-5 py-4 text-xs text-ink/70"><p>{fmtDate(item.startDate)}</p><p className="mt-1 text-ink/50">{fmtDate(item.expiryDate)}</p></td>
            <td className="px-5 py-4 text-xs text-ink/70">{fmtDate(item.nextBillingDate)}{item.pausedAt && <p className="mt-1 text-burgundy">Paused</p>}</td>
            <td className="px-5 py-4"><Badge variant={statusVariant(item.status)}>{statusText(item.status)}{item.pausedAt ? ' · Paused' : ''}</Badge></td>
            <td className="px-5 py-4"><div className="flex flex-wrap justify-end gap-1">
              <Button variant="ghost" className="min-h-9 px-3" aria-label={`View ${item.number}`} onClick={() => setSelected(item)}><Eye size={15} /> View</Button>
              {internal && ['DRAFT', 'QUOTATION'].includes(item.status) && <Button variant="ghost" className="min-h-9 px-3" onClick={() => startEdit(item)}><Pencil size={15} /> Edit</Button>}
              {internal && item.status === 'DRAFT' && <Button variant="secondary" className="min-h-9 px-3" disabled={busyId === item.id} onClick={() => void runAction(item, 'quotation')}><Send size={14} /> Send quote</Button>}
              {internal && item.status === 'QUOTATION' && <Button variant="secondary" className="min-h-9 px-3" disabled={busyId === item.id} onClick={() => void runAction(item, 'confirm')}><Check size={14} /> Confirm</Button>}
              {internal && item.status === 'CONFIRMED' && <Button className="min-h-9 px-3" disabled={busyId === item.id} onClick={() => void runAction(item, 'activate')}><Play size={14} /> Activate</Button>}
              {internal && item.status === 'ACTIVE' && <>
                {item.pausedAt ? <Button variant="secondary" className="min-h-9 px-3" disabled={busyId === item.id} onClick={() => void runAction(item, 'resume')}><Play size={14} /> Resume</Button> : <Button variant="secondary" className="min-h-9 px-3" disabled={busyId === item.id} onClick={() => void runAction(item, 'pause')}><Pause size={14} /> Pause</Button>}
                {item.plan.allowRenew && <Button variant="ghost" className="min-h-9 px-3" disabled={busyId === item.id} onClick={() => void runAction(item, 'renew')}><RotateCcw size={14} /> Renew</Button>}
                <Button variant="ghost" className="min-h-9 px-3" disabled={busyId === item.id} onClick={() => void runAction(item, 'close', `Close ${item.number}?`)}><X size={14} /> Close</Button>
                <Button variant="ghost" className="min-h-9 px-3" disabled={busyId === item.id || Boolean(item.pausedAt)} onClick={() => void generateNow(item)}><CircleDollarSign size={14} /> Invoice now</Button>
              </>}
              {admin && item.status === 'DRAFT' && <Button variant="ghost" className="min-h-9 px-3" disabled={busyId === item.id} onClick={() => void removeDraft(item)}><X size={14} /> Delete</Button>}
            </div></td>
          </tr>)}
          {!loading && items.length === 0 && <tr><td colSpan="7" className="px-5 py-14 text-center"><p className="font-semibold text-ink">No subscriptions found</p><p className="mt-1 text-sm text-ink/60">Create a draft or adjust the search and filters.</p></td></tr>}
        </tbody></table></div>
      <div className="flex flex-col gap-3 border-t border-burgundy/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="text-xs font-medium text-ink/60">Showing page {meta.page} of {Math.max(meta.pages, 1)}</p><div className="flex gap-2"><Button variant="secondary" className="min-h-10 flex-1 justify-center px-3 sm:min-h-9 sm:flex-none" disabled={page <= 1 || loading} onClick={() => setPage((old) => Math.max(1, old - 1))}><ChevronLeft size={15} /> Previous</Button><Button variant="secondary" className="min-h-10 flex-1 justify-center px-3 sm:min-h-9 sm:flex-none" disabled={page >= meta.pages || loading} onClick={() => setPage((old) => old + 1)}>Next <ChevronRight size={15} /></Button></div></div>
    </GlassCard>

    {selected && <GlassCard className="p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><Badge variant={statusVariant(selected.status)}>{statusText(selected.status)}</Badge><h2 className="mt-3 font-display text-2xl font-bold text-ink">{selected.number}</h2><p className="mt-1 text-sm text-ink/60">{selected.customer.companyName} · {selected.plan.name}</p></div><Button variant="ghost" className="min-h-9 px-3" onClick={() => setSelected(null)}><X size={15} /> Close details</Button></div>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">{stages.map((stage, index) => { const complete = stepIndex(selected.status) >= index; return <div key={stage} className={`rounded-2xl border p-3 text-center ${complete ? 'border-burgundy/15 bg-pink-light/35 text-burgundy' : 'border-burgundy/5 bg-white/40 text-ink/40'}`}><span className={`mx-auto grid h-7 w-7 place-items-center rounded-full ${complete ? 'bg-burgundy text-cream-soft' : 'bg-burgundy/10'}`}>{complete && selected.status !== 'CLOSED' ? <Check size={14} /> : index + 1}</span><p className="mt-2 text-xs font-bold">{statusText(stage)}</p></div>; })}</div>
      <div className="mt-5 grid gap-4 md:grid-cols-3"><div className="rounded-2xl bg-white/55 p-4"><p className="text-xs font-bold uppercase text-burgundy/65">Dates</p><p className="mt-2 text-sm text-ink">Starts {fmtDate(selected.startDate)}</p><p className="mt-1 text-sm text-ink/65">Expires {fmtDate(selected.expiryDate)}</p><p className="mt-1 text-sm text-ink/65">Next billing {fmtDate(selected.nextBillingDate)}</p>{selected.quotationValidUntil && <p className="mt-1 text-sm text-ink/65">Quote valid until {fmtDate(selected.quotationValidUntil)}</p>}</div><div className="rounded-2xl bg-white/55 p-4"><p className="text-xs font-bold uppercase text-burgundy/65">Lines</p>{selected.lines.map((line) => <p key={line.id} className="mt-2 text-sm text-ink">{line.quantity} × {line.product.name}{line.variant ? ` · ${line.variant.value}` : ''} <span className="text-ink/55">{currency(line.unitPrice)} each</span></p>)}</div><div className="rounded-2xl bg-white/55 p-4"><p className="text-xs font-bold uppercase text-burgundy/65">Plan rules</p><p className="mt-2 text-sm text-ink">Pause {selected.plan.allowPause ? 'allowed' : 'not allowed'}</p><p className="mt-1 text-sm text-ink">Renew {selected.plan.allowRenew ? 'allowed' : 'not allowed'}</p><p className="mt-1 text-sm text-ink">Early close {selected.plan.allowCloseEarly ? 'allowed' : 'not allowed'}</p></div></div>
      {selected.invoices.length > 0 && <div className="mt-5 rounded-2xl border border-burgundy/10 bg-white/50 p-4"><h3 className="font-semibold text-ink">Invoices</h3><div className="mt-2 flex flex-wrap gap-2">{selected.invoices.map((invoice) => <span key={invoice.id} className="rounded-full bg-cream-soft px-3 py-2 text-xs text-ink">{invoice.number} · {invoice.status} · {currency(invoice.total)}</span>)}</div></div>}
    </GlassCard>}
  </div>;
}
