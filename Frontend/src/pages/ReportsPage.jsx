import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { GlassCard } from '../components/ui/GlassCard.jsx';
import { Input } from '../components/ui/Input.jsx';
import { catalogApi } from '../api/catalog.js';
import { reportsApi } from '../api/reports.js';
import { getErrorMessage } from '../utils/errors.js';
import toast from 'react-hot-toast';
import { BarChart3, Download, FileSpreadsheet, ReceiptText, RefreshCw, TrendingUp, UsersRound, WalletCards } from 'lucide-react';

const currency = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
const startMonth = () => { const date = new Date(); date.setMonth(date.getMonth() - 5, 1); return date.toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);
const CHART_COLORS = ['#D8A7B1', '#B77F8B', '#8E2B4D', '#6D1A36', '#4A0F24'];

function buildParams(filters) {
  return {
    ...(filters.from ? { from: new Date(`${filters.from}T00:00:00.000Z`).toISOString() } : {}),
    ...(filters.to ? { to: new Date(`${filters.to}T23:59:59.999Z`).toISOString() } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.planId ? { planId: filters.planId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
}

function MetricCard({ label, value, caption, Icon, highlight = false }) {
  return <GlassCard className="relative overflow-hidden p-5"><div aria-hidden="true" className={`absolute -right-5 -top-7 h-24 w-24 rounded-full blur-2xl ${highlight ? 'bg-pink-light/70' : 'bg-burgundy/5'}`} /><div className="relative flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-burgundy/65">{label}</p><p className="mt-3 font-display text-2xl font-bold text-ink">{value}</p><p className="mt-1 text-xs text-ink/55">{caption}</p></div><span className="grid h-10 w-10 place-items-center rounded-2xl bg-pink-light/50 text-burgundy"><Icon size={18} /></span></div></GlassCard>;
}

function EmptyChart({ label }) { return <div className="grid h-60 place-items-center text-sm text-ink/50">No {label} data for this range.</div>; }

export function ReportsPage() {
  const [filters, setFilters] = useState({ from: startMonth(), to: today(), customerId: '', planId: '', status: '' });
  const [options, setOptions] = useState({ customers: [], plans: [] });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportType, setExportType] = useState('invoices');
  const [mode, setMode] = useState('SUMMARY');

  useEffect(() => {
    let active = true;
    Promise.all([catalogApi.customers({ page: 1, limit: 100 }), catalogApi.plans({ page: 1, limit: 100 })]).then(([customers, plans]) => {
      if (active) setOptions({ customers: customers.data.data, plans: plans.data.data });
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    reportsApi.summary(buildParams(filters)).then(({ data: response }) => { if (active) setData(response.data); })
      .catch((error) => { if (active) toast.error(getErrorMessage(error, 'Could not load reports.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters]);

  const kpis = data?.kpis || {};
  const paymentColors = useMemo(() => data?.paymentsByMethod?.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]) || [], [data?.paymentsByMethod]);
  async function exportCsv() {
    try {
      const { data: blob } = await reportsApi.exportCsv({ ...buildParams(filters), type: exportType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `darkside-${exportType}-${today()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('CSV export downloaded.');
    } catch (error) { toast.error(getErrorMessage(error, 'Could not export the report.')); }
  }

  return <div className="workspace-page mx-auto max-w-7xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><Badge variant="accent">ANALYTICS</Badge><h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">Reports dashboard</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">Monitor recurring revenue, collections, subscription movement, and overdue accounts.</p></div><div className="inline-flex items-center gap-2 rounded-full border border-burgundy/10 bg-white/55 px-4 py-2 text-xs font-semibold text-burgundy"><RefreshCw size={14} /> Refreshed on filter change</div></div>
    <GlassCard className="p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.25fr_1.25fr_1fr_auto] xl:items-end"><Input label="From" type="date" value={filters.from} onChange={(event) => setFilters((old) => ({ ...old, from: event.target.value }))} /><Input label="To" type="date" value={filters.to} onChange={(event) => setFilters((old) => ({ ...old, to: event.target.value }))} /><label className="block text-sm font-semibold text-ink">Customer<select value={filters.customerId} onChange={(event) => setFilters((old) => ({ ...old, customerId: event.target.value }))} className="mt-2 min-h-12 w-full rounded-2xl border border-burgundy/15 bg-white/75 px-4 text-sm"><option value="">All customers</option>{options.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}</select></label><label className="block text-sm font-semibold text-ink">Plan<select value={filters.planId} onChange={(event) => setFilters((old) => ({ ...old, planId: event.target.value }))} className="mt-2 min-h-12 w-full rounded-2xl border border-burgundy/15 bg-white/75 px-4 text-sm"><option value="">All plans</option>{options.plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><label className="block text-sm font-semibold text-ink">Subscription status<select value={filters.status} onChange={(event) => setFilters((old) => ({ ...old, status: event.target.value }))} className="mt-2 min-h-12 w-full rounded-2xl border border-burgundy/15 bg-white/75 px-4 text-sm"><option value="">All statuses</option>{['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label><Button variant="secondary" onClick={() => setFilters({ from: startMonth(), to: today(), customerId: '', planId: '', status: '' })}>Reset</Button></div></GlassCard>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard label="Active subscriptions" value={loading ? '—' : kpis.activeSubscriptions ?? 0} caption="Currently in service" Icon={UsersRound} />
      <MetricCard label="Monthly recurring revenue" value={loading ? '—' : currency(kpis.mrr)} caption="Normalized to monthly" Icon={TrendingUp} highlight />
      <MetricCard label="Revenue collected" value={loading ? '—' : currency(kpis.revenueCollected)} caption="Payments in selected period" Icon={WalletCards} />
      <MetricCard label="Outstanding" value={loading ? '—' : currency(kpis.outstandingAmount)} caption="Confirmed invoices" Icon={ReceiptText} />
      <MetricCard label="Overdue invoices" value={loading ? '—' : kpis.overdueInvoices ?? 0} caption="Past due with a balance" Icon={BarChart3} />
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3"><div className="inline-flex rounded-full border border-burgundy/10 bg-white/45 p-1"><button type="button" onClick={() => setMode('SUMMARY')} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === 'SUMMARY' ? 'bg-burgundy text-cream-soft' : 'text-burgundy'}`}>Summary</button><button type="button" onClick={() => setMode('DETAIL')} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === 'DETAIL' ? 'bg-burgundy text-cream-soft' : 'text-burgundy'}`}>Details</button></div><div className="flex flex-wrap items-center gap-2"><select aria-label="CSV data type" value={exportType} onChange={(event) => setExportType(event.target.value)} className="min-h-10 rounded-full border border-burgundy/15 bg-white/70 px-4 text-sm"><option value="invoices">Invoices</option><option value="payments">Payments</option><option value="subscriptions">Subscriptions</option><option value="overdue">Overdue invoices</option></select><Button variant="secondary" className="min-h-10" onClick={() => void exportCsv()}><Download size={15} /> Export CSV</Button></div></div>

    <div className="grid gap-5 xl:grid-cols-2">
      <GlassCard className="p-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-display font-bold text-ink">Collected revenue</h2><p className="mt-1 text-xs text-ink/55">Payments grouped by month</p></div><TrendingUp size={18} className="text-burgundy" /></div>{data?.revenueByMonth?.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.revenueByMonth} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}><CartesianGrid stroke="#EADBC3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11, fill: '#3B0D1E' }} /><YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fontSize: 10, fill: '#3B0D1E' }} /><Tooltip formatter={(value) => currency(value)} /><Bar dataKey="amount" name="Collected" radius={[8, 8, 0, 0]}>{data.revenueByMonth.map((item, index) => <Cell key={item.month} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div> : <EmptyChart label="revenue" />}</GlassCard>
      <GlassCard className="p-5"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-display font-bold text-ink">MRR trend</h2><p className="mt-1 text-xs text-ink/55">Annualized billing normalized to monthly</p></div><BarChart3 size={18} className="text-burgundy" /></div>{data?.mrrTrend?.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.mrrTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}><CartesianGrid stroke="#EADBC3" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11, fill: '#3B0D1E' }} /><YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={{ fontSize: 10, fill: '#3B0D1E' }} /><Tooltip formatter={(value) => currency(value)} /><Line type="monotone" dataKey="amount" name="MRR" stroke="#B77F8B" strokeWidth={3} dot={{ r: 4, fill: '#6D1A36' }} /></LineChart></ResponsiveContainer></div> : <EmptyChart label="MRR" />}</GlassCard>
      <GlassCard className="p-5"><div className="mb-3"><h2 className="font-display font-bold text-ink">Subscriptions by status</h2><p className="mt-1 text-xs text-ink/55">Current agreement lifecycle</p></div>{data?.subscriptionsByStatus?.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.subscriptionsByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={92} paddingAngle={3} label={({ status, count }) => `${status}: ${count}`}>{data.subscriptionsByStatus.map((entry, index) => <Cell key={entry.status} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div> : <EmptyChart label="subscription" />}</GlassCard>
      <GlassCard className="p-5"><div className="mb-3"><h2 className="font-display font-bold text-ink">Payments by method</h2><p className="mt-1 text-xs text-ink/55">Payment count in the selected range</p></div>{data?.paymentsByMethod?.length ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.paymentsByMethod} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}><CartesianGrid stroke="#EADBC3" vertical={false} /><XAxis dataKey="method" tick={{ fontSize: 10, fill: '#3B0D1E' }} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#3B0D1E' }} /><Tooltip formatter={(value, name) => name === 'amount' ? currency(value) : value} /><Bar dataKey="count" name="Payments" radius={[8, 8, 0, 0]}>{data.paymentsByMethod.map((entry, index) => <Cell key={entry.method} fill={paymentColors[index]} />)}</Bar></BarChart></ResponsiveContainer></div> : <EmptyChart label="payment" />}</GlassCard>
    </div>

    {mode === 'DETAIL' && <div className="grid gap-5 xl:grid-cols-2">
      <GlassCard className="overflow-hidden"><div className="flex items-center justify-between border-b border-burgundy/10 p-5"><div><h2 className="font-display font-bold text-ink">Overdue invoices</h2><p className="mt-1 text-xs text-ink/55">Sorted by oldest due date</p></div><Badge variant="accent">{data?.overdueInvoices?.length || 0}</Badge></div>{data?.overdueInvoices?.length ? <div className="divide-y divide-burgundy/5">{data.overdueInvoices.map((invoice) => <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold text-ink">{invoice.number} · {invoice.customer.companyName}</p><p className="mt-1 text-xs text-ink/55">{invoice.subscription.number} · {invoice.daysOverdue} days overdue</p></div><p className="font-bold text-burgundy">{currency(invoice.outstanding)}</p></div>)}</div> : <p className="p-6 text-sm text-ink/60">No overdue balances in this range.</p>}</GlassCard>
      <GlassCard className="overflow-hidden"><div className="flex items-center justify-between border-b border-burgundy/10 p-5"><div><h2 className="font-display font-bold text-ink">Recent payments</h2><p className="mt-1 text-xs text-ink/55">Latest recorded transactions</p></div><FileSpreadsheet size={18} className="text-burgundy" /></div>{data?.recentPayments?.length ? <div className="divide-y divide-burgundy/5">{data.recentPayments.map((payment) => <div key={payment.id} className="flex items-center justify-between gap-3 p-4"><div><p className="font-semibold text-ink">{payment.invoice.customer.companyName}</p><p className="mt-1 text-xs text-ink/55">{payment.invoice.number} · {payment.method.replace('_', ' ')}</p></div><p className="font-bold text-ink">{currency(payment.amount)}</p></div>)}</div> : <p className="p-6 text-sm text-ink/60">No payments recorded yet.</p>}</GlassCard>
      <GlassCard className="overflow-hidden xl:col-span-2"><div className="border-b border-burgundy/10 p-5"><h2 className="font-display font-bold text-ink">Recent subscriptions</h2><p className="mt-1 text-xs text-ink/55">Latest agreements</p></div>{data?.recentSubscriptions?.length ? <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">{data.recentSubscriptions.map((item) => <div key={item.id} className="rounded-2xl bg-white/55 p-4"><p className="font-semibold text-ink">{item.number}</p><p className="mt-1 text-xs text-ink/60">{item.customer.companyName}</p><p className="mt-2 flex items-center justify-between"><span className="text-xs text-ink/55">{item.plan.name}</span><Badge variant={item.status === 'ACTIVE' ? 'success' : 'muted'}>{item.status}</Badge></p></div>)}</div> : <p className="p-6 text-sm text-ink/60">No subscriptions match these filters.</p>}</GlassCard>
    </div>}
    {loading && <div className="sr-only" role="status">Refreshing reports</div>}
  </div>;
}
