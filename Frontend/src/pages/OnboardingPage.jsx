import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Building2, Boxes, ClipboardList, PackagePlus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogApi } from '../api/catalog.js';
import { settingsApi } from '../api/settings.js';
import { subscriptionsApi } from '../api/subscriptions.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { GlassCard } from '../components/ui/GlassCard.jsx';
import { getErrorMessage } from '../utils/errors.js';

const steps = [
  { key: 'company', title: 'Set your company identity', description: 'Add your billing name and support email for invoice PDFs.', href: '/settings', action: 'Company settings', Icon: Building2 },
  { key: 'product', title: 'Add a product or service', description: 'Create the item your recurring subscriptions will deliver.', href: '/products', action: 'Open products', Icon: Boxes },
  { key: 'plan', title: 'Create a subscription plan', description: 'Set the billing period, price, and lifecycle rules.', href: '/plans', action: 'Open plans', Icon: PackagePlus },
  { key: 'subscription', title: 'Start your first subscription', description: 'Choose a customer, plan, and items to create the first agreement.', href: '/subscriptions', action: 'Create subscription', Icon: ClipboardList },
];

export function OnboardingPage() {
  const [complete, setComplete] = useState({});
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const settings = await settingsApi.getCompany();
      const products = await catalogApi.products({ page: 1, limit: 1 });
      const plans = await catalogApi.plans({ page: 1, limit: 1 });
      const customers = await catalogApi.customers({ page: 1, limit: 1 });
      const subscriptions = await subscriptionsApi.list({ page: 1, limit: 1 });
      setComplete({
        company: settings.data.data.settingsStored,
        product: products.data.meta.total > 0,
        plan: plans.data.meta.total > 0,
        customer: customers.data.meta.total > 0,
        subscription: subscriptions.data.meta.total > 0,
      });
    } catch (error) { toast.error(getErrorMessage(error, 'Could not load setup progress.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const done = steps.filter((step) => complete[step.key]).length;
  const percent = Math.round(done / steps.length * 100);

  return <div className="workspace-page mx-auto max-w-5xl space-y-5"><div><Badge variant="accent">GETTING STARTED</Badge><h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">Your Darkside setup</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/65">A short guided path to a working subscription flow. You can come back to this checklist at any time.</p></div>
    <GlassCard className="relative overflow-hidden p-6 sm:p-8"><div aria-hidden="true" className="absolute -right-8 -top-14 h-48 w-48 rounded-full bg-pink-light/40 blur-3xl" /><div className="relative flex flex-wrap items-center justify-between gap-5"><div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-burgundy text-cream-soft"><Sparkles size={20} /></span><div><p className="font-display text-xl font-bold text-ink">{loading ? 'Checking your setup…' : done === steps.length ? 'You’re ready to go.' : `${done} of ${steps.length} steps complete`}</p><p className="mt-1 text-sm text-ink/55">{done === steps.length ? 'Your core workspace is ready.' : 'Complete the essentials to get billing underway.'}</p></div></div><div className="w-full max-w-xs"><div className="mb-2 flex justify-between text-xs font-bold text-ink/55"><span>Setup progress</span><span>{loading ? '—' : `${percent}%`}</span></div><div className="h-2 overflow-hidden rounded-full bg-burgundy/10"><div className="h-full rounded-full bg-burgundy transition-all" style={{ width: `${loading ? 0 : percent}%` }} /></div></div></div></GlassCard>
    <div className="space-y-3">{steps.map((step, index) => { const isDone = complete[step.key]; const Icon = isDone ? BadgeCheck : step.Icon; return <GlassCard key={step.key} className="p-5 sm:p-6"><div className="flex flex-wrap items-center gap-4"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${isDone ? 'bg-status-paid/10 text-status-paid' : 'bg-[#EBCBD1] text-burgundy'}`}><Icon size={19} /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-ink/40">Step {index + 1}</p><h2 className="mt-1 font-display font-bold text-ink">{step.title}</h2><p className="mt-1 text-xs leading-5 text-ink/55">{step.description}</p></div><Link to={step.href}><Button variant={isDone ? 'secondary' : 'primary'} className="min-h-10 px-4">{isDone ? 'Review' : step.action} <ArrowRight size={14} /></Button></Link></div></GlassCard>; })}</div>
    {!complete.customer && !loading && <p className="rounded-2xl border border-burgundy/10 bg-white/45 p-4 text-xs leading-5 text-ink/60">Customer accounts are created through public sign-up. Invite your first customer to register before you create their subscription.</p>}
    <div className="flex justify-end"><Button variant="ghost" onClick={() => void load()} disabled={loading}>Refresh progress</Button></div>
  </div>;
}
