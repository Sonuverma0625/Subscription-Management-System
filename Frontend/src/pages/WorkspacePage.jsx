import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Boxes, ClipboardList, ReceiptText, TrendingUp, UsersRound, WalletCards } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { reportsApi } from '../api/reports.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { GlassCard } from '../components/ui/GlassCard.jsx';
import { useAuthStore } from '../store/authStore.js';
import { getErrorMessage } from '../utils/errors.js';
import toast from 'react-hot-toast';

const currency = (value) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
const statusColors = ['#B77F8B', '#D8A7B1', '#8E2B4D', '#6D1A36', '#4A0F24'];
const revenueColors = ['#D8A7B1', '#D8A7B1', '#B77F8B', '#8E2B4D', '#6D1A36', '#4A0F24'];

function DashboardMetric({ label, value, detail, Icon }) {
  return <GlassCard className="relative overflow-hidden p-5 sm:p-6">
    <div aria-hidden="true" className="absolute -right-6 -top-7 h-24 w-24 rounded-full bg-pink-light/45 blur-2xl" />
    <div className="relative flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[.12em] text-ink/55">{label}</p><p className="mt-3 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-[27px]">{value}</p><p className="mt-1 text-xs font-medium text-ink/50">{detail}</p></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-pink-light/65 text-burgundy"><Icon size={18} /></span></div>
  </GlassCard>;
}

const shortcuts = [
  { to: '/subscriptions', label: 'Subscriptions', detail: 'Manage lifecycle and renewals', Icon: ClipboardList },
  { to: '/invoices', label: 'Invoices & payments', detail: 'Keep collections moving', Icon: ReceiptText },
  { to: '/products', label: 'Products & plans', detail: 'Shape your recurring catalog', Icon: Boxes },
  { to: '/reports', label: 'Analytics & reports', detail: 'Explore trends and export data', Icon: BarChart3 },
];

export function WorkspacePage() {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    reportsApi.summary().then(({ data: response }) => { if (active) setData(response.data); })
      .catch((error) => { if (active) toast.error(getErrorMessage(error, 'Could not load workspace analytics.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const kpis = data?.kpis || {};
  const insights = data?.insights || {};
  return <div className="workspace-page mx-auto max-w-7xl space-y-5 sm:space-y-6">
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }} className="workspace-hero relative overflow-hidden rounded-[24px] border border-burgundy/10 bg-cream-soft px-6 py-6 text-ink shadow-glass sm:px-8 sm:py-7">
      <div aria-hidden="true" className="absolute -right-8 -top-28 h-72 w-72 rounded-full bg-pink-light/55 blur-[80px]" />
      <div aria-hidden="true" className="absolute bottom-[-110px] right-[24%] h-56 w-56 rounded-full bg-cream-deep/50 blur-[75px]" />
      <div className="relative flex flex-wrap items-end justify-between gap-5"><div><Badge variant="accent">{user.role} WORKSPACE</Badge><p className="mt-5 text-sm font-semibold text-ink/60">Good to see you, {user.name}</p><h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink sm:text-[40px]">Your business, in view.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-ink/65">A live overview of recurring revenue, customer activity, and the work that keeps everything moving.</p></div><Link to="/reports"><Button className="min-h-11">Open reports <ArrowRight size={15} /></Button></Link></div>
    </motion.section>

    <section aria-label="Workspace metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardMetric label="Active subscriptions" value={loading ? '—' : kpis.activeSubscriptions ?? 0} detail="Currently in service" Icon={UsersRound} />
      <DashboardMetric label="Monthly recurring revenue" value={loading ? '—' : currency(kpis.mrr)} detail="Normalized to monthly" Icon={TrendingUp} />
      <DashboardMetric label="Collected revenue" value={loading ? '—' : currency(kpis.revenueCollected)} detail="Payments in this period" Icon={WalletCards} />
      <DashboardMetric label="Outstanding invoices" value={loading ? '—' : currency(kpis.outstandingAmount)} detail={`${kpis.overdueInvoices ?? 0} overdue`} Icon={ReceiptText} />
    </section>

    <section aria-label="Growth and retention insights" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[['MRR growth', `${Number(insights.mrrGrowthPercent || 0) > 0 ? '+' : ''}${insights.mrrGrowthPercent ?? 0}%`, 'Compared with 30 days ago', TrendingUp], ['30-day churn', `${insights.churnRate ?? 0}%`, 'Subscriptions closed this month', UsersRound], ['Renewals coming up', insights.renewalsNext30 ?? 0, 'Next 30 days', ClipboardList], ['Overdue balance', currency(insights.overdueAmount), 'Invoices past due', ReceiptText]].map(([label, value, detail, Icon]) => <GlassCard key={label} className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pink-light/65 text-burgundy"><Icon size={17} /></span><span><span className="block text-[10px] font-bold uppercase tracking-wide text-ink/50">{label}</span><span className="mt-1 block font-display text-lg font-extrabold text-ink">{loading ? '—' : value}</span><span className="block text-[10px] text-ink/45">{detail}</span></span></GlassCard>)}
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
      <GlassCard className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-ink">Collected revenue</h2><p className="mt-1 text-xs text-ink/55">Monthly payments, based on your workspace data</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EBCBD1] text-[#6D1A36]"><TrendingUp size={17} /></span></div>
        <div className="mt-4 h-[245px]">{data?.revenueByMonth?.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.revenueByMonth} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}><CartesianGrid stroke="#EADBC3" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#3B0D1E' }} dy={10} /><YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#3B0D1E' }} /><Tooltip formatter={(value) => [currency(value), 'Collected']} contentStyle={{ borderRadius: 12, border: '1px solid #EADBC3', fontSize: 12 }} /><Bar dataKey="amount" name="Collected" radius={[7, 7, 1, 1]} maxBarSize={42}>{data.revenueByMonth.map((item, index) => <Cell key={item.month} fill={revenueColors[index % revenueColors.length]} />)}</Bar></BarChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-ink/50">{loading ? 'Loading revenue…' : 'No revenue data yet.'}</div>}</div>
      </GlassCard>
      <GlassCard className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-ink">Subscription health</h2><p className="mt-1 text-xs text-ink/55">Agreements by lifecycle stage</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-pink-light/65 text-burgundy"><BarChart3 size={17} /></span></div>
        <div className="mt-4 h-[245px]">{data?.subscriptionsByStatus?.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={data.subscriptionsByStatus} layout="vertical" margin={{ top: 6, right: 16, left: 4, bottom: 0 }}><CartesianGrid stroke="#EADBC3" horizontal={false} /><XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#3B0D1E' }} /><YAxis type="category" dataKey="status" width={85} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#3B0D1E' }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #EADBC3', fontSize: 12 }} /><Bar dataKey="count" name="Subscriptions" radius={[0, 6, 6, 0]} maxBarSize={23}>{data.subscriptionsByStatus.map((item, index) => <Cell key={item.status} fill={statusColors[index % statusColors.length]} />)}</Bar></BarChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-ink/50">{loading ? 'Loading subscriptions…' : 'No subscriptions yet.'}</div>}</div>
      </GlassCard>
      <GlassCard className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold text-ink">Overdue trend</h2><p className="mt-1 text-xs text-ink/55">Outstanding balance by due month</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-burgundy/5 text-burgundy"><ReceiptText size={17} /></span></div>
        <div className="mt-4 h-[245px]">{insights.overdueByMonth?.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={insights.overdueByMonth} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}><CartesianGrid stroke="#EADBC3" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#3B0D1E' }} dy={10} /><YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#3B0D1E' }} /><Tooltip formatter={(value) => [currency(value), 'Overdue']} contentStyle={{ borderRadius: 12, border: '1px solid #EADBC3', fontSize: 12 }} /><Bar dataKey="amount" name="Overdue" fill="#4A0F24" radius={[7, 7, 1, 1]} maxBarSize={42} /></BarChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-ink/50">{loading ? 'Loading overdue…' : 'No overdue balance.'}</div>}</div>
      </GlassCard>
    </section>

    <section><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-burgundy/65">Move things forward</p><h2 className="mt-1 font-display text-xl font-bold text-ink">Your workspace</h2></div><p className="hidden text-xs text-ink/50 sm:block">Everything your team needs, within reach.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{shortcuts.map(({ to, label, detail, Icon }, index) => <motion.div key={to} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}><Link to={to} className="group flex h-full items-center gap-3 rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-burgundy/20 hover:bg-white hover:shadow-md"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EBCBD1] text-[#6D1A36] transition group-hover:bg-[#6D1A36] group-hover:text-cream-soft"><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-ink">{label}</span><span className="mt-1 block text-[11px] leading-4 text-ink/55">{detail}</span></span><ArrowRight size={15} className="shrink-0 text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-burgundy" /></Link></motion.div>)}</div></section>
  </div>;
}
