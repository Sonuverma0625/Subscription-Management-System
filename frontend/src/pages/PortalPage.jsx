import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { portalApi } from '../api/portal.js';
import { invoicesApi } from '../api/invoices.js';
import { paymentsApi } from '../api/payments.js';
import { loadRazorpayCheckout } from '../utils/razorpay.js';
import { useAuthStore } from '../store/authStore.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { GlassCard } from '../components/ui/GlassCard.jsx';
import { getErrorMessage } from '../utils/errors.js';
import toast from 'react-hot-toast';
import { ArrowRight, CalendarClock, CircleDollarSign, CreditCard, Download, Pause, Play, ReceiptText, RotateCcw, X } from 'lucide-react';

const currency = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const fmtDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';

export function PortalPage() {
  const user = useAuthStore((state) => state.user);
  const [summary, setSummary] = useState(null);
  const [plans, setPlans] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState({ enabled: false });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await portalApi.summary();
      setSummary(data.data);
      const planResult = await portalApi.plans();
      setPlans(planResult.data.data);
      const gatewayResult = await paymentsApi.razorpayConfig();
      setPaymentConfig(gatewayResult.data.data);
    }
    catch (error) { toast.error(getErrorMessage(error, 'Could not load your account.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function action(subscription, name) {
    const messages = { pause: 'Pause billing for this subscription?', cancel: 'Cancel this subscription? This closes it immediately.', renew: 'Renew this subscription for one billing period?' };
    if (messages[name] && !window.confirm(messages[name])) return;
    setBusyId(subscription.id);
    try {
      await portalApi[name](subscription.id);
      toast.success(name === 'cancel' ? 'Subscription cancelled.' : `Subscription ${name === 'pause' ? 'paused' : name === 'renew' ? 'renewed' : 'resumed'}.`);
      await load();
    } catch (error) { toast.error(getErrorMessage(error, `Could not ${name} this subscription.`)); }
    finally { setBusyId(''); }
  }
  async function download(invoice) {
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
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { toast.error(getErrorMessage(error, 'Could not download the invoice.')); }
    finally { setBusyId(''); }
  }

  async function changePlan(subscription, planId) {
    const next = plans.find((plan) => plan.id === planId);
    const message = next ? `Schedule ${next.name} from your next billing date?` : 'Cancel the scheduled plan change and keep your current plan?';
    if (!window.confirm(message)) return;
    setBusyId(subscription.id);
    try {
      await portalApi.changePlan(subscription.id, planId || null);
      toast.success(next ? `Plan change to ${next.name} scheduled for the next billing date.` : 'Scheduled plan change cancelled.');
      await load();
    } catch (error) { toast.error(getErrorMessage(error, 'Could not schedule a plan change.')); }
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
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: order.companyName,
        description: `Invoice ${order.invoiceNumber}`,
        prefill: { name: order.customerName, email: order.customerEmail, ...(order.customerContact ? { contact: order.customerContact } : {}) },
        theme: { color: '#6D1A36' },
        modal: { ondismiss: () => setBusyId('') },
        handler: async (payload) => {
          try {
            await paymentsApi.verifyRazorpay(payload);
            toast.success('Payment received. Your receipt is on its way.');
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
    <div className="flex flex-wrap items-end justify-between gap-4"><div><Badge variant="accent">CUSTOMER PORTAL</Badge><h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">Your Darkside account</h1><p className="mt-2 text-sm leading-6 text-ink/65">Hi {user.name}. Review your subscriptions, invoices, payment history, and renewal dates.</p></div><Link to="/subscriptions" className="inline-flex items-center gap-2 rounded-full border border-burgundy/15 bg-white/65 px-4 py-2.5 text-sm font-semibold text-burgundy hover:bg-white">All subscriptions <ArrowRight size={15} /></Link></div>
    {loading && !summary ? <GlassCard className="p-8 text-sm text-ink/60">Loading your account…</GlassCard> : summary && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GlassCard className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-burgundy/65">Active subscriptions</p><p className="mt-3 font-display text-3xl font-bold text-ink">{summary.activeSubscriptions}</p><p className="mt-1 text-xs text-ink/55">Includes paused agreements</p></GlassCard>
        <GlassCard className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-burgundy/65">Outstanding balance</p><p className="mt-3 font-display text-3xl font-bold text-ink">{currency(summary.outstanding)}</p><p className="mt-1 text-xs text-ink/55">Across your latest invoices</p></GlassCard>
        <GlassCard className="p-5 sm:col-span-2"><p className="text-xs font-bold uppercase tracking-wide text-burgundy/65">Next renewal</p>{summary.upcomingRenewal ? <><p className="mt-3 font-display text-xl font-bold text-ink">{summary.upcomingRenewal.plan}</p><p className="mt-1 text-sm text-ink/60">{summary.upcomingRenewal.number} · {fmtDate(summary.upcomingRenewal.date)}</p></> : <p className="mt-3 text-sm text-ink/60">No upcoming renewal is scheduled.</p>}</GlassCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <GlassCard className="overflow-hidden"><div className="flex items-center justify-between gap-3 border-b border-burgundy/10 p-5"><div><h2 className="font-display text-lg font-bold text-ink">Your subscriptions</h2><p className="mt-1 text-xs text-ink/55">Pause, renew, or cancel based on your plan rules.</p></div><Link to="/subscriptions" className="text-xs font-bold text-burgundy">View all</Link></div>
          <div className="divide-y divide-burgundy/5">{summary.subscriptions.length === 0 && <p className="p-6 text-sm text-ink/60">You do not have active subscriptions yet.</p>}{summary.subscriptions.map((subscription) => <div key={subscription.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="font-semibold text-ink">{subscription.plan.name}</h3><Badge variant={subscription.pausedAt ? 'muted' : 'success'}>{subscription.pausedAt ? 'Paused' : 'Active'}</Badge></div><p className="mt-1 text-xs text-ink/55">{subscription.number} · Next billing {fmtDate(subscription.nextBillingDate)}</p>{subscription.pendingPlan && <p className="mt-1 text-xs font-semibold text-burgundy">Changing to {subscription.pendingPlan.name} on the next billing date</p>}</div><p className="font-semibold text-ink">{currency(subscription.plan.price)} / {subscription.plan.billingPeriod.toLowerCase()}</p></div>
            <div className="mt-4 flex flex-wrap items-center gap-2">{subscription.pausedAt ? <Button variant="secondary" className="min-h-9 px-3" disabled={busyId === subscription.id} onClick={() => void action(subscription, 'resume')}><Play size={14} /> Resume</Button> : subscription.plan.allowPause && <Button variant="secondary" className="min-h-9 px-3" disabled={busyId === subscription.id} onClick={() => void action(subscription, 'pause')}><Pause size={14} /> Pause</Button>}{subscription.plan.allowRenew && <Button variant="ghost" className="min-h-9 px-3" disabled={busyId === subscription.id} onClick={() => void action(subscription, 'renew')}><RotateCcw size={14} /> Renew</Button>}{subscription.plan.allowCloseEarly && <Button variant="ghost" className="min-h-9 px-3" disabled={busyId === subscription.id} onClick={() => void action(subscription, 'cancel')}><X size={14} /> Cancel</Button>}<label className="ml-auto flex min-h-9 items-center gap-2 text-xs font-semibold text-ink/60">Change next cycle<select aria-label={`Change plan for ${subscription.number}`} value={subscription.pendingPlanId || ''} disabled={busyId === subscription.id || subscription.pausedAt} onChange={(event) => void changePlan(subscription, event.target.value)} className="min-h-9 max-w-48 rounded-full border border-burgundy/15 bg-white px-3 text-xs text-ink"><option value="">Keep current</option>{plans.filter((plan) => plan.id !== subscription.planId).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {currency(plan.price)}</option>)}</select></label></div>
          </div>)}</div>
        </GlassCard>

        <GlassCard className="overflow-hidden"><div className="flex items-center justify-between gap-3 border-b border-burgundy/10 p-5"><div><h2 className="font-display text-lg font-bold text-ink">Recent invoices</h2><p className="mt-1 text-xs text-ink/55">Download a PDF copy whenever you need it.</p></div><Link to="/invoices" className="text-xs font-bold text-burgundy">View all</Link></div>
          <div className="divide-y divide-burgundy/5">{summary.invoices.length === 0 && <p className="p-6 text-sm text-ink/60">Invoices will appear here when billing runs.</p>}{summary.invoices.map((invoice) => { const overdue = invoice.status === 'CONFIRMED' && new Date(invoice.dueDate) < new Date(); const balance = Math.max(0, Number(invoice.total) - Number(invoice.amountPaid)); return <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="flex items-center gap-2"><p className="font-semibold text-ink">{invoice.number}</p><Badge variant={invoice.status === 'PAID' ? 'success' : overdue ? 'accent' : 'muted'}>{invoice.status === 'PAID' ? 'Paid' : overdue ? 'Overdue' : invoice.status}</Badge></div><p className="mt-1 text-xs text-ink/55">Due {fmtDate(invoice.dueDate)}</p><p className="mt-1 text-sm font-semibold text-ink">{currency(balance)} outstanding</p></div><div className="flex gap-2">{paymentConfig.enabled && invoice.status === 'CONFIRMED' && balance > 0 && <Button className="min-h-9 px-3" disabled={busyId === invoice.id} onClick={() => void payOnline(invoice)}><CreditCard size={14} /> {busyId === invoice.id ? 'Opening…' : 'Pay online'}</Button>}<Button variant="ghost" className="min-h-9 px-3" disabled={busyId === invoice.id} aria-label={`Download invoice ${invoice.number}`} onClick={() => void download(invoice)}><Download size={15} /> PDF</Button></div></div>; })}</div>
        </GlassCard>
      </div>

      <GlassCard className="overflow-hidden"><div className="flex items-center justify-between border-b border-burgundy/10 p-5"><div><h2 className="font-display text-lg font-bold text-ink">Payment history</h2><p className="mt-1 text-xs text-ink/55">Your latest recorded payments.</p></div><CircleDollarSign size={19} className="text-burgundy" /></div>{summary.payments.length === 0 ? <p className="p-6 text-sm text-ink/60">No payments recorded yet.</p> : <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">{summary.payments.map((payment) => <div key={payment.id} className="flex items-center gap-3 rounded-2xl bg-white/55 p-4"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-pink-light/50 text-burgundy"><ReceiptText size={18} /></span><div className="min-w-0"><p className="font-semibold text-ink">{currency(payment.amount)} · {payment.method.replace('_', ' ')}</p><p className="mt-1 truncate text-xs text-ink/55">{payment.invoice.number} · {fmtDate(payment.paymentDate)}</p></div></div>)}</div>}</GlassCard>
    </>}
    <div className="flex items-center gap-2 rounded-2xl border border-burgundy/10 bg-white/45 px-4 py-3 text-xs text-ink/60"><CalendarClock size={15} className="text-burgundy" /> Subscription actions follow the rules set for each plan.</div>
    {paymentConfig.enabled && <div className="flex items-start gap-3 rounded-2xl border border-burgundy/10 bg-white/45 px-4 py-3 text-xs leading-5 text-ink/60"><CreditCard size={16} className="mt-0.5 shrink-0 text-burgundy" /> Online payments open in Razorpay Checkout. If saved-card support is enabled for the merchant account, you can choose whether to save a tokenized card there; Darkside does not store card numbers.</div>}
  </div>;
}
