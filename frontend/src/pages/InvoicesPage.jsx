import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { GlassCard } from '../components/ui/GlassCard.jsx';
import { Input } from '../components/ui/Input.jsx';
import { invoicesApi } from '../api/invoices.js';
import { paymentsApi } from '../api/payments.js';
import { loadRazorpayCheckout } from '../utils/razorpay.js';
import { useAuthStore } from '../store/authStore.js';
import { getErrorMessage } from '../utils/errors.js';
import toast from 'react-hot-toast';
import { Check, ChevronLeft, ChevronRight, CreditCard, Download, Eye, Mail, Play, ReceiptText, Search, X } from 'lucide-react';

const currency = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const fmtDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
const invoiceStatusText = (item) => item.status === 'PAID' ? 'Paid' : item.status === 'CANCELLED' ? 'Cancelled' : item.status === 'DRAFT' ? 'Draft' : new Date(item.dueDate) < new Date() && Number(item.amountPaid) < Number(item.total) ? 'Overdue' : 'Confirmed';
const invoiceStatusVariant = (item) => item.status === 'PAID' ? 'success' : invoiceStatusText(item) === 'Overdue' ? 'accent' : item.status === 'DRAFT' || item.status === 'CANCELLED' ? 'muted' : 'accent';

export function InvoicesPage() {
  const user = useAuthStore((state) => state.user);
  const internal = user.role !== 'CUSTOMER';
  const admin = user.role === 'ADMIN';
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [billingSummary, setBillingSummary] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState({ enabled: false });
  const [paymentForm, setPaymentForm] = useState({ method: 'BANK_TRANSFER', amount: '', paymentDate: new Date().toISOString().slice(0, 10), note: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await invoicesApi.list({ page, limit: 20, ...(statusFilter ? { status: statusFilter } : {}), ...(search ? { search } : {}) });
      setItems(data.data);
      setMeta(data.meta);
      if (selected) {
        const refreshed = data.data.find((item) => item.id === selected.id);
        if (refreshed) setSelected(refreshed);
      }
    } catch (error) { toast.error(getErrorMessage(error, 'Could not load invoices.')); }
    finally { setLoading(false); }
  }, [page, statusFilter, search, selected?.id]);

  useEffect(() => { const timer = window.setTimeout(() => { setPage(1); setSearch(searchInput.trim()); }, 250); return () => window.clearTimeout(timer); }, [searchInput]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!internal) paymentsApi.razorpayConfig().then(({ data }) => setPaymentConfig(data.data)).catch(() => setPaymentConfig({ enabled: false }));
  }, [internal]);

  async function runBilling() {
    setBusyId('billing');
    try {
      const { data } = await invoicesApi.runBilling();
      setBillingSummary(data.data);
      toast.success(data.message);
      await load();
    } catch (error) { toast.error(getErrorMessage(error, 'Could not run billing.')); }
    finally { setBusyId(''); }
  }
  async function action(item, name) {
    setBusyId(item.id);
    try {
      if (name === 'confirm') await invoicesApi.confirm(item.id);
      else if (name === 'send') await invoicesApi.send(item.id);
      else await invoicesApi.cancel(item.id);
      toast.success(name === 'confirm' ? 'Invoice confirmed.' : name === 'send' ? 'Invoice emailed to the customer.' : 'Invoice cancelled.');
      await load();
    } catch (error) { toast.error(getErrorMessage(error, `Could not ${name} the invoice.`)); }
    finally { setBusyId(''); }
  }
  async function downloadPdf(invoice) {
    setBusyId(invoice.id);
    try {
      const { data } = await invoicesApi.pdf(invoice.id);
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) { toast.error(getErrorMessage(error, 'Could not download this invoice.')); }
    finally { setBusyId(''); }
  }
  async function recordPayment(event) {
    event.preventDefault();
    if (!selected) return;
    setBusyId(selected.id);
    try {
      await paymentsApi.create({ invoiceId: selected.id, method: paymentForm.method, amount: Number(paymentForm.amount), paymentDate: new Date(paymentForm.paymentDate), note: paymentForm.note || null });
      toast.success('Payment recorded.');
      setPaymentForm({ method: 'BANK_TRANSFER', amount: '', paymentDate: new Date().toISOString().slice(0, 10), note: '' });
      const { data } = await invoicesApi.get(selected.id);
      setSelected(data.data.invoice);
      await load();
    } catch (error) { toast.error(getErrorMessage(error, 'Could not record payment.')); }
    finally { setBusyId(''); }
  }

  async function payOnline(invoice) {
    if (!paymentConfig.enabled) { toast.error('Online payment is not configured yet. Contact the billing team.'); return; }
    setBusyId(invoice.id);
    try {
      const loaded = await loadRazorpayCheckout();
      if (!loaded) throw new Error('Could not load secure payment checkout. Check your connection and try again.');
      const { data } = await paymentsApi.createOrder({ invoiceId: invoice.id });
      const order = data.data;
      const checkout = new window.Razorpay({
        key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency,
        name: order.companyName, description: `Invoice ${order.invoiceNumber}`,
        prefill: { name: order.customerName, email: order.customerEmail, ...(order.customerContact ? { contact: order.customerContact } : {}) },
        theme: { color: '#6D1A36' }, modal: { ondismiss: () => setBusyId('') },
        handler: async (payload) => {
          try {
            await paymentsApi.verifyRazorpay(payload);
            toast.success('Payment received. Your receipt is on its way.');
            const refreshed = await invoicesApi.get(invoice.id);
            setSelected(refreshed.data.data.invoice);
            await load();
          } catch (error) { toast.error(getErrorMessage(error, 'Payment confirmation is pending. Refresh your invoices shortly.')); }
          finally { setBusyId(''); }
        },
      });
      checkout.on('payment.failed', (event) => {
        void paymentsApi.reportRazorpayFailure({ orderId: order.orderId, reason: event.error?.description || 'Checkout payment failed' }).catch(() => {});
        toast.error(event.error?.description || 'Payment failed. You can retry from your invoices.');
        setBusyId('');
      });
      checkout.open();
    } catch (error) { toast.error(getErrorMessage(error, 'Could not start checkout.')); setBusyId(''); }
  }

  return <div className="workspace-page mx-auto max-w-7xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><Badge variant="accent">BILLING</Badge><h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">Invoices</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">Review generated billing periods, confirm invoices, and track outstanding balances.</p></div>{admin && <Button disabled={busyId === 'billing'} onClick={() => void runBilling()}><Play size={16} />{busyId === 'billing' ? 'Running billing…' : 'Run billing'}</Button>}</div>
    {billingSummary && <GlassCard className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold text-ink">Last billing run</p><p className="mt-1 text-sm text-ink/60">{billingSummary.subscriptions} subscriptions checked · {billingSummary.created} created · {billingSummary.skipped} skipped · {billingSummary.failed} failed</p></div><Button variant="ghost" className="min-h-9 px-3" onClick={() => setBillingSummary(null)}><X size={15} /> Dismiss</Button></GlassCard>}

    <GlassCard className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-burgundy/10 p-5 sm:p-6">
        <div><h2 className="font-display text-lg font-bold text-ink">Invoice register</h2><p className="mt-1 text-sm text-ink/60">Page {meta.page} of {Math.max(meta.pages, 1)} · {meta.total} records</p></div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto"><div className="w-full sm:w-64"><Input aria-label="Search invoices" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search invoice, customer" className="min-h-10 py-2 pl-10" /><Search size={16} className="pointer-events-none -mt-7 ml-4 text-ink/45" aria-hidden="true" /></div><select aria-label="Filter invoice status" value={statusFilter} onChange={(event) => { setPage(1); setStatusFilter(event.target.value); }} className="min-h-10 rounded-full border border-burgundy/15 bg-white/75 px-4 text-sm"><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="CONFIRMED">Confirmed</option><option value="PAID">Paid</option><option value="CANCELLED">Cancelled</option></select></div>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-cream-soft/75 text-xs uppercase tracking-wide text-burgundy/70"><tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Billing period</th><th className="px-5 py-3">Due date</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Outstanding</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-burgundy/5">
          {loading && <tr><td colSpan="8" className="px-5 py-12 text-center text-ink/60">Loading invoices…</td></tr>}
          {!loading && items.map((item) => <tr key={item.id} className="hover:bg-cream-soft/45">
            <td className="px-5 py-4"><p className="font-bold text-ink">{item.number}</p><p className="mt-1 text-xs text-ink/55">{item.subscription.number}</p></td>
            <td className="px-5 py-4"><p className="font-semibold text-ink">{item.customer.companyName}</p><p className="mt-1 text-xs text-ink/55">{item.customer.user.email}</p></td>
            <td className="whitespace-nowrap px-5 py-4 text-xs text-ink/70">{fmtDate(item.billingPeriodStart)} – {fmtDate(item.billingPeriodEnd)}</td>
            <td className="whitespace-nowrap px-5 py-4 text-xs text-ink/70">{fmtDate(item.dueDate)}</td>
            <td className="px-5 py-4 font-semibold text-ink">{currency(item.total)}</td>
            <td className="px-5 py-4 text-ink/70">{currency(Math.max(0, Number(item.total) - Number(item.amountPaid)))}</td>
            <td className="px-5 py-4"><Badge variant={invoiceStatusVariant(item)}>{invoiceStatusText(item)}</Badge></td>
            <td className="px-5 py-4"><div className="flex justify-end gap-1">{!internal && paymentConfig.enabled && item.status === 'CONFIRMED' && Number(item.total) > Number(item.amountPaid) && <Button className="min-h-9 px-3" disabled={busyId === item.id} onClick={() => void payOnline(item)}><CreditCard size={14} /> Pay</Button>}<Button variant="ghost" className="min-h-9 px-3" onClick={() => { setSelected(item); setPaymentForm((old) => ({ ...old, amount: Math.max(0, Number(item.total) - Number(item.amountPaid)).toFixed(2) })); }}><Eye size={15} /> View</Button>{internal && item.status === 'DRAFT' && <Button variant="secondary" className="min-h-9 px-3" disabled={busyId === item.id} onClick={() => void action(item, 'confirm')}><Check size={14} /> Confirm</Button>}{internal && item.status === 'CONFIRMED' && <Button variant="ghost" className="min-h-9 px-3" disabled={busyId === item.id} onClick={() => void action(item, 'send')}><Mail size={14} /> Send</Button>}{internal && ['DRAFT', 'CONFIRMED'].includes(item.status) && <Button variant="ghost" className="min-h-9 px-3" disabled={busyId === item.id} onClick={() => void action(item, 'cancel')}><X size={14} /> Cancel</Button>}</div></td>
          </tr>)}
          {!loading && items.length === 0 && <tr><td colSpan="8" className="px-5 py-14 text-center"><p className="font-semibold text-ink">No invoices found</p><p className="mt-1 text-sm text-ink/60">Invoices appear here after an active subscription is billed.</p></td></tr>}
        </tbody></table></div>
      <div className="flex flex-col gap-3 border-t border-burgundy/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="text-xs font-medium text-ink/60">Showing page {meta.page} of {Math.max(meta.pages, 1)}</p><div className="flex gap-2"><Button variant="secondary" className="min-h-10 flex-1 justify-center px-3 sm:min-h-9 sm:flex-none" disabled={page <= 1 || loading} onClick={() => setPage((old) => Math.max(1, old - 1))}><ChevronLeft size={15} /> Previous</Button><Button variant="secondary" className="min-h-10 flex-1 justify-center px-3 sm:min-h-9 sm:flex-none" disabled={page >= meta.pages || loading} onClick={() => setPage((old) => old + 1)}>Next <ChevronRight size={15} /></Button></div></div>
    </GlassCard>

    {selected && <GlassCard className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-burgundy/10 p-5 sm:p-7"><div><Badge variant={invoiceStatusVariant(selected)}>{invoiceStatusText(selected)}</Badge><h2 className="mt-3 font-display text-2xl font-bold text-ink">{selected.number}</h2><p className="mt-1 text-sm text-ink/60">{selected.customer.companyName} · {selected.subscription.number} · {selected.subscription.plan.name}</p></div><div className="flex flex-wrap gap-2">{!internal && paymentConfig.enabled && selected.status === 'CONFIRMED' && Number(selected.total) > Number(selected.amountPaid) && <Button className="min-h-9 px-3" disabled={busyId === selected.id} onClick={() => void payOnline(selected)}><CreditCard size={14} /> Pay online</Button>}<Button variant="secondary" className="min-h-9 px-3" disabled={busyId === selected.id} onClick={() => void downloadPdf(selected)}><Download size={15} /> Download PDF</Button><Button variant="ghost" className="min-h-9 px-3" onClick={() => setSelected(null)}><X size={15} /> Close</Button></div></div>
      <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_300px]">
        <div className="overflow-x-auto"><table className="w-full min-w-[550px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-burgundy/65"><tr><th className="border-b border-burgundy/10 py-3">Description</th><th className="border-b border-burgundy/10 py-3 text-right">Qty</th><th className="border-b border-burgundy/10 py-3 text-right">Unit price</th><th className="border-b border-burgundy/10 py-3 text-right">Tax</th><th className="border-b border-burgundy/10 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-burgundy/5">{selected.lines.map((line) => <tr key={line.id}><td className="py-3 pr-4 text-ink">{line.description}{Number(line.discountAmount) > 0 && <span className="mt-1 block text-xs text-ink/55">Discount applied: {currency(line.discountAmount)}</span>}</td><td className="py-3 text-right text-ink/70">{line.quantity}</td><td className="py-3 text-right text-ink/70">{currency(line.unitPrice)}</td><td className="py-3 text-right text-ink/70">{Number(line.taxRate)}% · {currency(line.taxAmount)}</td><td className="py-3 text-right font-semibold text-ink">{currency(line.amount)}</td></tr>)}</tbody></table></div>
        <div className="h-fit rounded-3xl bg-cream-soft/70 p-5"><p className="text-xs font-bold uppercase tracking-wide text-burgundy/65">Invoice summary</p><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-ink/65">Billing period</span><span className="text-right font-medium text-ink">{fmtDate(selected.billingPeriodStart)}<br />to {fmtDate(selected.billingPeriodEnd)}</span></div><div className="flex justify-between"><span className="text-ink/65">Due date</span><span className="font-medium text-ink">{fmtDate(selected.dueDate)}</span></div><div className="border-t border-burgundy/10 pt-3"><div className="flex justify-between"><span className="text-ink/65">Subtotal</span><span>{currency(selected.subtotal)}</span></div><div className="mt-2 flex justify-between"><span className="text-ink/65">Discounts</span><span>−{currency(selected.discountTotal)}</span></div><div className="mt-2 flex justify-between"><span className="text-ink/65">Tax</span><span>{currency(selected.taxTotal)}</span></div></div><div className="flex justify-between border-t border-burgundy/10 pt-3 text-base font-bold text-ink"><span>Total</span><span>{currency(selected.total)}</span></div><div className="flex justify-between text-sm"><span className="text-ink/65">Paid</span><span>{currency(selected.amountPaid)}</span></div><div className="flex justify-between font-semibold text-burgundy"><span>Outstanding</span><span>{currency(Math.max(0, Number(selected.total) - Number(selected.amountPaid)))}</span></div></div></div>
      </div>
      {selected.payments?.length > 0 && <div className="border-t border-burgundy/10 px-5 py-5 sm:px-7"><h3 className="font-display font-bold text-ink">Payment history</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{selected.payments.map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/55 p-4"><div><p className="font-semibold text-ink">{currency(payment.amount)} · {payment.method.replace('_', ' ')}</p><p className="mt-1 text-xs text-ink/60">{fmtDate(payment.paymentDate)}{payment.note ? ` · ${payment.note}` : ''}</p></div><Badge variant="success">Recorded</Badge></div>)}</div></div>}
      {internal && selected.status === 'CONFIRMED' && Number(selected.amountPaid) < Number(selected.total) && <form onSubmit={recordPayment} className="border-t border-burgundy/10 bg-cream-soft/35 p-5 sm:p-7"><div className="mb-4"><h3 className="font-display font-bold text-ink">Record a payment</h3><p className="mt-1 text-sm text-ink/60">Outstanding: {currency(Number(selected.total) - Number(selected.amountPaid))}</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="block text-sm font-semibold text-ink">Method<select value={paymentForm.method} onChange={(event) => setPaymentForm((old) => ({ ...old, method: event.target.value }))} className="mt-2 min-h-12 w-full rounded-2xl border border-burgundy/15 bg-white/75 px-4 text-sm"><option value="CARD">Card</option><option value="BANK_TRANSFER">Bank transfer</option><option value="UPI">UPI</option><option value="CASH">Cash</option><option value="CHEQUE">Cheque</option></select></label><Input label="Amount" type="number" min="0.01" max={Number(selected.total) - Number(selected.amountPaid)} step="0.01" required value={paymentForm.amount} onChange={(event) => setPaymentForm((old) => ({ ...old, amount: event.target.value }))} /><Input label="Payment date" type="date" required value={paymentForm.paymentDate} onChange={(event) => setPaymentForm((old) => ({ ...old, paymentDate: event.target.value }))} /><Input label="Note" value={paymentForm.note} onChange={(event) => setPaymentForm((old) => ({ ...old, note: event.target.value }))} placeholder="Reference or note" /></div><Button type="submit" className="mt-4" disabled={busyId === selected.id}>Record payment</Button></form>}
    </GlassCard>}
  </div>;
}
