import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDownRight, ArrowRight, ArrowUpRight, BadgeCheck, BarChart3, BellRing, Check, ChevronLeft, ChevronRight, CircleDollarSign, CreditCard, Layers3, LockKeyhole, Pause, Play, RefreshCw, ShieldCheck, UserRound, UsersRound, Workflow } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { publicApi } from '../api/public.js';
import { getErrorMessage } from '../utils/errors.js';
import { BrandLogo } from '../components/layout/BrandLogo.jsx';

const sampleRevenue = [
  { month: 'May', amount: 34 }, { month: 'Jun', amount: 42 }, { month: 'Jul', amount: 39 },
  { month: 'Aug', amount: 55 }, { month: 'Sep', amount: 62 }, { month: 'Oct', amount: 78 },
];

const revenueColors = ['#D8A7B1', '#D8A7B1', '#B77F8B', '#8E2B4D', '#6D1A36', '#4A0F24'];

const features = [
  { icon: Layers3, number: '01', title: 'One connected catalog', copy: 'Bring products, plans, tax rules, discounts, and quotation templates into one tidy place.' },
  { icon: RefreshCw, number: '02', title: 'Billing that keeps moving', copy: 'Guide every subscription from first quote to renewal, with invoices and payments in step.' },
  { icon: BarChart3, number: '03', title: 'Clear signals for your team', copy: 'See recurring revenue, collections, and overdue balances in reports built for action.' },
];

const carouselSlides = [
  { ...features[0], eyebrow: 'A connected catalog', steps: ['Products', 'Plans', 'Taxes & discounts'], highlight: 'Shape every offer in one place' },
  { ...features[1], eyebrow: 'Billing in rhythm', steps: ['Draft', 'Quotation', 'Invoice & payment'], highlight: 'Move smoothly from quote to renewal' },
  { ...features[2], eyebrow: 'Clear signals', steps: ['Recurring revenue', 'Collections', 'Renewals'], highlight: 'Know what needs your attention' },
  { icon: UserRound, number: '04', title: 'A portal customers can use', copy: 'Give customers one place to review renewals, invoices, payments, and plan-permitted account actions.', eyebrow: 'Customer self-service', steps: ['Subscriptions', 'Invoices', 'Plan actions'], highlight: 'Keep account tasks self-serve' },
  { icon: CreditCard, number: '05', title: 'Payments stay connected to billing', copy: 'Track partial payments, outstanding balances, and online checkout against the invoice they belong to.', eyebrow: 'Payments & invoices', steps: ['Invoice', 'Checkout', 'Payment record'], highlight: 'See what is paid and what remains' },
  { icon: BellRing, number: '06', title: 'Keep teams ahead of changes', copy: 'Make renewals, failed payments, and important account changes visible with reminders and audit history.', eyebrow: 'Timely follow-through', steps: ['Renewal alerts', 'Payment retry', 'Audit history'], highlight: 'Make the next step clear' },
];

const tickerItems = ['Products & plans', 'Quotes to renewals', 'Invoices & payments', 'Customer self-service', 'Renewal notifications', 'Payment retries', 'MRR & revenue reports', 'CSV exports', 'Roles & audit history', 'Guided workspace setup'];

const heroSlides = [
  { icon: Workflow, eyebrow: 'Connected from day one', title: 'Every step, moving together.', copy: 'Bring plans, billing, and renewals into one clear workflow.', steps: ['Shape plans', 'Collect payments', 'Renew with confidence'] },
  { icon: CreditCard, eyebrow: 'Billing that follows through', title: 'Keep every invoice in rhythm.', copy: 'See payments, balances, and customer actions in the same place.', steps: ['Send invoices', 'Track balances', 'Keep customers moving'] },
  { icon: BarChart3, eyebrow: 'A clearer view of growth', title: 'Make the next move with clarity.', copy: 'Turn recurring revenue and collection signals into confident action.', steps: ['Read your MRR', 'Spot what changed', 'Plan the next step'] },
];

function HighlightsMarquee() {
  return <section aria-label="Darkside highlights" className="home-marquee overflow-hidden border-y border-burgundy-dark/30 bg-burgundy py-3 text-cream-soft">
    <p className="sr-only">Explore products and plans, quotations, invoices and payments, customer self-service, renewal reminders, reports, exports, team roles, audit history, and workspace setup.</p>
    <div aria-hidden="true" className="home-marquee-track flex w-max">
      {[0, 1].map((copy) => <div key={copy} className="flex shrink-0 items-center gap-8 px-6 sm:gap-12 sm:px-8">
        {tickerItems.map((item) => <span key={item} className="inline-flex items-center gap-3 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.15em] sm:text-[11px]"><span className="h-1.5 w-1.5 rounded-full bg-pink-light" />{item}</span>)}
      </div>)}
    </div>
  </section>;
}

function FeatureCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const slide = carouselSlides[activeIndex];
  const Icon = slide.icon;

  useEffect(() => {
    if (!autoPlay || hovered || focused || prefersReducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % carouselSlides.length), 6000);
    return () => window.clearInterval(timer);
  }, [activeIndex, autoPlay, focused, hovered, prefersReducedMotion]);

  const move = (step) => setActiveIndex((index) => (index + step + carouselSlides.length) % carouselSlides.length);

  return <div role="region" aria-roledescription="carousel" aria-label="Darkside platform features" className="mt-8" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className="overflow-hidden rounded-[24px] border border-burgundy/10 bg-cream-soft shadow-[0_14px_44px_rgba(59,13,30,.07)]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.article key={slide.number} aria-label={`Slide ${activeIndex + 1} of ${carouselSlides.length}: ${slide.title}`} aria-roledescription="slide" initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -18 }} transition={{ duration: prefersReducedMotion ? 0 : 0.28, ease: 'easeOut' }} className="grid md:grid-cols-[1fr_.95fr]">
          <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-burgundy/60">{slide.number} / 0{carouselSlides.length} · {slide.eyebrow}</p>
            <h3 className="mt-3 max-w-lg font-display text-2xl font-bold leading-tight tracking-[-.035em] text-ink sm:text-3xl">{slide.title}</h3>
            <p className="mt-3 max-w-lg text-sm leading-6 text-ink/65">{slide.copy}</p>
            <div className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl border border-burgundy/10 bg-white/75 px-3.5 py-2.5 text-xs font-bold text-burgundy"><span className="grid h-6 w-6 place-items-center rounded-lg bg-pink-light/60"><Icon size={14} /></span>{slide.highlight}</div>
          </div>
          <div aria-hidden="true" className="relative m-3 mt-0 flex min-h-[240px] flex-col justify-between overflow-hidden rounded-[20px] bg-[#4A0F24] p-5 text-cream-soft sm:m-4 sm:mt-4 sm:min-h-[280px] sm:p-6 md:ml-0">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/[0.08]" />
            <div className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full border border-white/[0.08]" />
            <div className="relative flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.16em] text-cream-soft/60">Workflow snapshot</span><span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.07]"><Icon size={18} /></span></div>
            <div className="relative grid grid-cols-2 gap-2.5 sm:gap-3">
              {slide.steps.map((step, index) => <div key={step} className="rounded-xl border border-white/[0.11] bg-white/[0.06] p-3 sm:p-4"><span className="text-[9px] font-bold tracking-[.14em] text-pink-light/70">0{index + 1}</span><p className="mt-1.5 text-xs font-semibold leading-5 text-cream-soft sm:text-sm">{step}</p></div>)}
            </div>
            <div className="relative flex items-center gap-2 border-t border-white/10 pt-3 text-[10px] font-medium text-cream-soft/65"><span className="h-1.5 w-1.5 rounded-full bg-[#9BC7A8]" />One connected workspace</div>
          </div>
        </motion.article>
      </AnimatePresence>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[11px] font-semibold text-ink/50">Explore the platform <span className="mx-1.5 text-burgundy/30">/</span> {activeIndex + 1} of {carouselSlides.length}</p>
      <div className="flex items-center gap-2">
        <div className="mr-1 flex items-center gap-1.5" aria-label="Choose a slide">
          {carouselSlides.map((item, index) => <button key={item.number} type="button" aria-label={`Show slide ${index + 1}: ${item.title}`} aria-current={activeIndex === index ? 'true' : undefined} onClick={() => setActiveIndex(index)} className={`h-2 rounded-full transition-all ${activeIndex === index ? 'w-6 bg-burgundy' : 'w-2 bg-burgundy/20 hover:bg-burgundy/40'}`} />)}
        </div>
        <button type="button" aria-label="Previous slide" onClick={() => move(-1)} className="grid h-9 w-9 place-items-center rounded-xl border border-burgundy/10 bg-white/80 text-burgundy transition hover:bg-white"><ChevronLeft size={17} /></button>
        <button type="button" aria-label="Next slide" onClick={() => move(1)} className="grid h-9 w-9 place-items-center rounded-xl border border-burgundy/10 bg-white/80 text-burgundy transition hover:bg-white"><ChevronRight size={17} /></button>
        <button type="button" aria-label={autoPlay ? 'Pause slides' : 'Play slides'} aria-pressed={!autoPlay} onClick={() => setAutoPlay((playing) => !playing)} className="ml-1 grid h-9 w-9 place-items-center rounded-xl border border-burgundy/10 bg-white/80 text-burgundy transition hover:bg-white">{autoPlay ? <Pause size={15} /> : <Play size={15} />}</button>
      </div>
    </div>
  </div>;
}

function HeroSpotlight() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const slide = heroSlides[activeIndex];
  const Icon = slide.icon;

  useEffect(() => {
    if (!autoPlay || hovered || focused || prefersReducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % heroSlides.length), 5200);
    return () => window.clearInterval(timer);
  }, [activeIndex, autoPlay, focused, hovered, prefersReducedMotion]);

  return <div role="region" aria-roledescription="carousel" aria-label="Darkside workflow highlights" className="mt-6 max-w-[540px]" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <div className="overflow-hidden rounded-2xl border border-burgundy/10 bg-white/55 shadow-[0_10px_30px_rgba(59,13,30,.045)] backdrop-blur-sm">
      <div className="flex items-start gap-3.5 p-4 sm:gap-4 sm:p-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={slide.eyebrow} initial={prefersReducedMotion ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -5 }} transition={{ duration: prefersReducedMotion ? 0 : 0.24 }} className="flex min-w-0 flex-1 items-start gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pink-light/65 text-burgundy"><Icon size={18} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-burgundy/60">{slide.eyebrow}</p><span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.11em] text-status-paid"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-paid" />In motion</span></div>
              <h2 className="mt-1.5 font-display text-base font-bold tracking-[-.02em] text-ink sm:text-lg">{slide.title}</h2>
              <p className="mt-1 text-xs leading-5 text-ink/60">{slide.copy}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {slide.steps.map((step, index) => <span key={step} className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-ink/55"><span className={`grid h-4 w-4 place-items-center rounded-full text-[8px] ${index === 0 ? 'bg-burgundy text-cream-soft' : 'border border-burgundy/15 bg-white/70 text-burgundy/60'}`}>{index + 1}</span>{step}{index < slide.steps.length - 1 && <ArrowRight size={10} className="ml-0.5 text-burgundy/30" />}</span>)}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="flex shrink-0 items-center gap-1 self-start pt-0.5">
          {heroSlides.map((item, index) => <button key={item.eyebrow} type="button" aria-label={`Show workflow slide ${index + 1}: ${item.title}`} aria-current={activeIndex === index ? 'true' : undefined} onClick={() => setActiveIndex(index)} className={`h-1.5 rounded-full transition-all ${activeIndex === index ? 'w-5 bg-burgundy' : 'w-1.5 bg-burgundy/20 hover:bg-burgundy/40'}`} />)}
          <button type="button" aria-label={autoPlay ? 'Pause workflow slides' : 'Play workflow slides'} aria-pressed={!autoPlay} onClick={() => setAutoPlay((playing) => !playing)} className="ml-1 grid h-7 w-7 place-items-center rounded-lg text-burgundy/65 transition hover:bg-pink-light/55 hover:text-burgundy">{autoPlay ? <Pause size={12} /> : <Play size={12} />}</button>
        </div>
      </div>
      <div aria-hidden="true" className="home-hero-marquee overflow-hidden border-t border-burgundy/[0.07] bg-white/30 py-2">
        <div aria-hidden="true" className="home-marquee-track flex w-max">
          {[0, 1].map((copy) => <div key={copy} className="flex shrink-0 items-center gap-5 px-4 sm:gap-7">
            {['Plans', 'Subscriptions', 'Invoices', 'Payments', 'Renewals', 'Insights'].map((item) => <span key={item} className="inline-flex items-center gap-2 whitespace-nowrap text-[9px] font-bold uppercase tracking-[.13em] text-ink/45"><span className="h-1 w-1 rounded-full bg-burgundy-light/70" />{item}</span>)}
          </div>)}
        </div>
      </div>
    </div>
  </div>;
}

function DashboardPreview() {
  return <div className="relative mx-auto w-full max-w-[560px] pb-6 pl-3 pr-3 pt-3 sm:px-6 sm:pt-5">
    <div aria-hidden="true" className="absolute -right-4 top-8 h-64 w-64 rounded-full bg-[#EADBC3]/25 blur-[85px]" />
    <motion.div initial={{ opacity: 0, y: 18, rotate: 1.5 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.65, delay: 0.12 }} className="relative overflow-hidden rounded-[24px] border border-cream-soft/80 bg-[#FFF8EE] p-5 text-ink shadow-[0_20px_56px_rgba(59,13,30,0.10)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-3">
        <div><p className="text-[11px] font-bold uppercase tracking-[.17em] text-ink/50">Workspace overview</p><p className="mt-1.5 font-display text-lg font-bold">Revenue pulse</p></div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-status-paid/10 px-3 py-1.5 text-[11px] font-bold text-status-paid"><span className="h-1.5 w-1.5 rounded-full bg-status-paid/100" /> Workspace preview</span>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-4 rounded-2xl bg-[#F8F0E3] p-4 sm:p-5">
        <div><p className="text-xs font-semibold text-ink/60">Monthly recurring revenue</p><p className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">₹8.42L</p><p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-status-paid"><ArrowUpRight size={14} /> 12.8% <span className="font-medium text-ink/50">vs. last month</span></p></div>
        <div className="mb-1 grid h-11 w-11 place-items-center rounded-2xl bg-[#6D1A36] text-cream-soft"><CircleDollarSign size={21} /></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-1"><p className="text-sm font-bold">Recurring revenue</p><p className="text-[11px] font-medium text-ink/50">Last 6 months · sample</p></div>
      <div className="mt-2 h-[170px] w-full sm:h-[185px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={sampleRevenue} margin={{ top: 12, right: 2, left: 2, bottom: 0 }}><CartesianGrid stroke="#EADBC3" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#3B0D1E' }} dy={9} /><Tooltip cursor={{ fill: '#EADBC3' }} formatter={(value) => [`₹${value}k`, 'MRR']} contentStyle={{ borderRadius: 14, border: '1px solid #EADBC3', fontSize: 12 }} /><Bar dataKey="amount" radius={[6, 6, 2, 2]} maxBarSize={30}>{sampleRevenue.map((entry, index) => <Cell key={entry.month} fill={revenueColors[index % revenueColors.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-cream-deep pt-3">
        <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EBCBD1] text-[#6D1A36]"><UsersRound size={16} /></span><div><p className="text-sm font-extrabold">1,284</p><p className="text-[10px] font-medium text-ink/50">Active customers</p></div></div>
        <div className="flex items-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-status-paid/10 text-status-paid"><BadgeCheck size={16} /></span><div><p className="text-sm font-extrabold">98.6%</p><p className="text-[10px] font-medium text-ink/50">Invoices collected</p></div></div>
      </div>
    </motion.div>
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, delay: 0.7 }} className="absolute -bottom-1 right-0 flex items-center gap-3 rounded-2xl border border-cream-soft/70 bg-cream-soft px-4 py-3 shadow-xl sm:-right-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EBCBD1] text-[#6D1A36]"><Check size={19} /></span><div><p className="text-xs font-extrabold text-ink">Billing run complete</p><p className="mt-0.5 text-[10px] font-medium text-ink/50">All caught up · just now</p></div>
    </motion.div>
  </div>;
}

export function HomePage() {
  const [demoForm, setDemoForm] = useState({ name: '', email: '', companyName: '', message: '', website: '' });
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoSent, setDemoSent] = useState(false);
  async function requestDemo(event) {
    event.preventDefault();
    setDemoBusy(true);
    try {
      await publicApi.requestDemo(demoForm);
      setDemoSent(true);
      setDemoForm({ name: '', email: '', companyName: '', message: '', website: '' });
      toast.success('Thanks. Your demo request is in.');
    } catch (error) { toast.error(getErrorMessage(error, 'Could not send your request. Please try again.')); }
    finally { setDemoBusy(false); }
  }
  return <main className="min-h-screen overflow-hidden bg-[#F8F0E3] text-ink">
    <header className="relative z-20 border-b border-burgundy/10 bg-cream/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between px-3 sm:h-[76px] sm:px-8">
        <Link to="/home" aria-label="Darkside Subscriptions home"><BrandLogo /></Link>
        <nav className="hidden items-center gap-9 text-[13px] font-semibold text-ink/60 md:flex" aria-label="Main navigation"><a className="transition hover:text-[#6D1A36]" href="#platform">Platform</a><a className="transition hover:text-[#6D1A36]" href="#about">About</a><a className="transition hover:text-[#6D1A36]" href="#insights">Insights</a></nav>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3"><Link to="/login" className="rounded-full px-2.5 py-2 text-[11px] font-bold text-ink/80 transition hover:text-[#6D1A36] sm:px-4 sm:text-sm">Log in</Link><Link to="/signup" className="inline-flex items-center gap-1.5 rounded-full bg-[#6D1A36] px-3 py-2.5 text-[11px] font-bold text-cream-soft shadow-lg shadow-[#6D1A36]/15 transition hover:-translate-y-0.5 hover:bg-[#4A0F24] sm:gap-2 sm:px-5 sm:text-sm">Get started <ArrowRight size={14} /></Link></div>
      </div>
    </header>

    <section className="relative isolate overflow-hidden bg-cream text-ink">
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_24%,rgba(235,203,209,.5),transparent_38%),radial-gradient(ellipse_at_6%_88%,rgba(234,219,195,.55),transparent_40%)]" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-[.04] [background-image:linear-gradient(rgba(109,26,54,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(109,26,54,.1)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
      <div className="mx-auto grid w-full min-w-0 max-w-[1240px] grid-cols-[minmax(0,1fr)] items-center gap-4 px-5 py-10 sm:px-8 sm:py-14 lg:min-h-[600px] lg:grid-cols-[.95fr_1.05fr] lg:gap-8 lg:py-16">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="relative z-10 min-w-0 max-w-[570px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-burgundy/15 bg-cream-soft/75 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-burgundy sm:text-[11px]"><span className="h-1.5 w-1.5 rounded-full bg-burgundy-light" /> A more considered way to scale</div>
          <h1 className="mt-5 max-w-[620px] font-display text-[43px] font-semibold leading-[1.07] tracking-[-.045em] text-ink sm:text-6xl lg:text-[64px]">Recurring revenue, <span className="text-burgundy">beautifully</span> in sync.</h1>
          <p className="mt-5 max-w-[500px] text-[15px] leading-7 text-ink/65 sm:text-base sm:leading-7">Darkside brings subscriptions, billing, and customer relationships into one clear view—so your team can focus on the next stage of growth.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3"><Link to="/signup" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-burgundy px-5 text-sm font-bold text-cream-soft shadow-sm shadow-burgundy/15 transition hover:-translate-y-px hover:bg-burgundy-dark">Explore Darkside <ArrowRight size={16} /></Link><a href="#platform" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-burgundy/20 bg-white/30 px-4 text-sm font-semibold text-burgundy transition hover:border-burgundy/35 hover:bg-pink-light/35">Discover the platform <ArrowDownRight size={15} /></a></div>
          <HeroSpotlight />
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-burgundy/10 pt-5 text-[11px] font-semibold text-ink/60"><span className="inline-flex items-center gap-2"><LockKeyhole size={14} className="text-burgundy-light" /> Secure by design</span><span className="inline-flex items-center gap-2"><Workflow size={15} className="text-burgundy-light" /> One connected workflow</span></div>
        </motion.div>
        <div className="min-w-0"><DashboardPreview /></div>
      </div>
      <div className="mx-auto max-w-[1240px] px-5 pb-6 sm:px-8"><p className="text-[10px] font-semibold text-ink/40">Illustrative dashboard preview</p></div>
    </section>

    <HighlightsMarquee />

    <section id="platform" className="mx-auto max-w-[1240px] scroll-mt-8 px-5 py-14 sm:px-8 sm:py-16">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-[11px] font-extrabold uppercase tracking-[.19em] text-[#8E2B4D]">The platform</p><h2 className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight tracking-[-.035em] sm:text-[42px]">Every part of recurring business, <span className="text-[#8E2B4D]">working together.</span></h2></div><p className="max-w-md text-sm leading-7 text-ink/60">A thoughtful toolkit for the full customer journey—from a first quotation to a healthy renewal.</p></div>
      <FeatureCarousel />
    </section>

    <section id="about" className="scroll-mt-8 border-y border-[#EADBC3] bg-[#F8F0E3]">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
        <div><p className="text-[11px] font-extrabold uppercase tracking-[.19em] text-[#8E2B4D]">About Darkside</p><h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-[-.035em] sm:text-[42px]">Built to make the complex feel clear.</h2><p className="mt-4 max-w-lg text-sm leading-7 text-ink/75">Recurring revenue touches every team. Darkside gives your people one shared workspace to shape plans, support customers, keep billing on track, and understand what is changing.</p><Link to="/signup" className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#6D1A36] hover:gap-3">See what you can do <ArrowRight size={16} /></Link></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-[22px] border border-burgundy/10 bg-pink-light/45 p-5 text-ink sm:col-span-2 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-burgundy-light">From first quote to renewal</p><p className="mt-2 max-w-md font-display text-2xl font-bold leading-snug sm:text-[27px]">A steady rhythm for your customer lifecycle.</p></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream-soft/80 text-burgundy"><RefreshCw size={19} /></span></div><div className="mt-6 grid grid-cols-2 gap-2 text-center text-[10px] font-semibold text-ink/65 sm:grid-cols-4 sm:text-xs"><span className="rounded-lg border border-burgundy/10 bg-cream-soft/75 px-2 py-2.5">Configure</span><span className="rounded-lg border border-burgundy/10 bg-cream-soft/75 px-2 py-2.5">Quote</span><span className="rounded-lg border border-burgundy/10 bg-cream-soft/75 px-2 py-2.5">Collect</span><span className="rounded-lg border border-burgundy/10 bg-cream-soft/75 px-2 py-2.5">Renew</span></div></div><div className="rounded-[22px] border border-cream-deep bg-cream-soft p-5"><p className="font-display text-3xl font-extrabold text-burgundy">One view</p><p className="mt-2 text-xs leading-5 text-ink/60">for products, subscriptions, invoices, and customer activity</p></div><div className="rounded-[22px] border border-cream-deep bg-cream-soft p-5"><p className="font-display text-3xl font-extrabold text-burgundy">Your data</p><p className="mt-2 text-xs leading-5 text-ink/60">with roles and access designed for teams and customers</p></div></div>
      </div>
    </section>

    <section id="insights" className="mx-auto grid max-w-[1240px] scroll-mt-8 items-center gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[1fr_.8fr]">
      <div><p className="text-[11px] font-extrabold uppercase tracking-[.19em] text-[#8E2B4D]">Better visibility</p><h2 className="mt-3 max-w-xl font-display text-3xl font-bold leading-tight tracking-[-.035em] sm:text-[42px]">Know what is moving. Know what needs you.</h2><p className="mt-4 max-w-lg text-sm leading-7 text-ink/60">Use a clear view of monthly recurring revenue, payments, subscription status, and outstanding balances to make your next decision with confidence.</p><div className="mt-5 space-y-2.5 text-sm font-semibold text-ink/80"><p className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#EBCBD1] text-[#6D1A36]"><Check size={13} /></span> Revenue and subscription trend charts</p><p className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#EBCBD1] text-[#6D1A36]"><Check size={13} /></span> Invoice collection and overdue visibility</p><p className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#EBCBD1] text-[#6D1A36]"><Check size={13} /></span> Report exports for the conversations that matter</p></div></div>
      <div className="rounded-[24px] border border-[#EADBC3] bg-cream-soft p-5 shadow-[0_14px_44px_rgba(59,13,30,.06)] sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/50">Revenue trend</p><p className="mt-2 font-display text-xl font-bold">A clearer view of momentum</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EBCBD1] text-[#6D1A36]"><BarChart3 size={18} /></span></div><div className="mt-4 h-[210px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={sampleRevenue} margin={{ top: 14, right: 0, left: 0, bottom: 0 }}><CartesianGrid stroke="#EADBC3" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#3B0D1E' }} dy={10} /><Tooltip cursor={{ fill: '#EADBC3' }} formatter={(value) => [`₹${value}k`, 'MRR']} contentStyle={{ borderRadius: 12, border: '1px solid #EADBC3', fontSize: 12 }} /><Bar dataKey="amount" radius={[7, 7, 1, 1]} maxBarSize={34}>{sampleRevenue.map((entry, index) => <Cell key={entry.month} fill={revenueColors[index % revenueColors.length]} />)}</Bar></BarChart></ResponsiveContainer></div><p className="mt-2 text-[10px] font-medium text-ink/50">Illustrative sample data</p></div>
    </section>

    <section id="contact" className="scroll-mt-8 border-y border-[#EADBC3] bg-[#F8F0E3]"><div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[.8fr_1.2fr]">
      <div><p className="text-[11px] font-extrabold uppercase tracking-[.19em] text-[#8E2B4D]">A closer look</p><h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-[-.035em] sm:text-[42px]">See how Darkside could fit your workflow.</h2><p className="mt-4 max-w-md text-sm leading-7 text-ink/75">Tell us a little about your team and what you manage today. We’ll follow up to arrange a guided walkthrough.</p><div className="mt-5 space-y-2.5 text-sm font-semibold text-ink/80"><p className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#EBCBD1] text-[#6D1A36]"><Check size={13} /></span> Subscription lifecycle and plan management</p><p className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#EBCBD1] text-[#6D1A36]"><Check size={13} /></span> Invoices, collections, and customer portal</p><p className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#EBCBD1] text-[#6D1A36]"><Check size={13} /></span> Reporting that helps the team follow through</p></div>
        <div className="mt-8"><p className="text-[11px] font-extrabold uppercase tracking-[.17em] text-[#8E2B4D]">Questions, answered</p><div className="mt-3 divide-y divide-[#EADBC3]">{[
          ['What can I manage in Darkside?', 'Products, plans, subscription status, quotations, invoices, payments, customer actions, and workspace reports.'],
          ['Can customers manage their own subscriptions?', 'Yes. The customer portal shows renewals, invoices, payment history, and plan-permitted pause, renewal, cancellation, and plan-change actions.'],
          ['Can we accept payments online?', 'Razorpay checkout is supported when merchant keys are configured. Customers can pay confirmed invoice balances from the portal.'],
        ].map(([question, answer]) => <details key={question} className="group py-3"><summary className="cursor-pointer list-none pr-5 text-sm font-bold text-ink marker:hidden">{question}<span className="float-right text-[#8E2B4D] transition group-open:rotate-45">+</span></summary><p className="mt-3 max-w-lg text-sm leading-6 text-ink/60">{answer}</p></details>)}</div></div>
      </div>
      <div className="rounded-[24px] border border-[#EADBC3] bg-cream-soft p-5 shadow-[0_14px_44px_rgba(59,13,30,.06)] sm:p-6"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-ink/50">Request a demo</p><h3 className="mt-2 font-display text-2xl font-bold">Let’s make it practical.</h3><p className="mt-2 text-sm text-ink/60">A short note is enough to get started.</p></div>
        {demoSent && <div role="status" className="mb-5 rounded-2xl border border-status-paid/25 bg-status-paid/10 px-4 py-3 text-sm font-semibold text-status-paid">Request received. We’ll be in touch soon.</div>}
        <form onSubmit={requestDemo} className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold text-ink/75">Your name<input required minLength="2" maxLength="100" value={demoForm.name} onChange={(event) => setDemoForm((old) => ({ ...old, name: event.target.value }))} className="mt-2 min-h-10 w-full rounded-xl border border-cream-deep bg-[#FFF8EE] px-3 text-sm font-medium outline-none transition focus:border-[#8E2B4D] focus:ring-4 focus:ring-[#8E2B4D]/10" placeholder="Name" /></label><label className="block text-xs font-bold text-ink/75">Work email<input required type="email" maxLength="254" value={demoForm.email} onChange={(event) => setDemoForm((old) => ({ ...old, email: event.target.value }))} className="mt-2 min-h-10 w-full rounded-xl border border-cream-deep bg-[#FFF8EE] px-3 text-sm font-medium outline-none transition focus:border-[#8E2B4D] focus:ring-4 focus:ring-[#8E2B4D]/10" placeholder="you@company.com" /></label><label className="block text-xs font-bold text-ink/75 sm:col-span-2">Company<input required minLength="2" maxLength="120" value={demoForm.companyName} onChange={(event) => setDemoForm((old) => ({ ...old, companyName: event.target.value }))} className="mt-2 min-h-10 w-full rounded-xl border border-cream-deep bg-[#FFF8EE] px-3 text-sm font-medium outline-none transition focus:border-[#8E2B4D] focus:ring-4 focus:ring-[#8E2B4D]/10" placeholder="Company name" /></label><label className="block text-xs font-bold text-ink/75 sm:col-span-2">What would you like to see?<textarea required minLength="10" maxLength="2000" rows="4" value={demoForm.message} onChange={(event) => setDemoForm((old) => ({ ...old, message: event.target.value }))} className="mt-2 w-full rounded-xl border border-cream-deep bg-[#FFF8EE] px-3 py-2.5 text-sm font-medium outline-none transition focus:border-[#8E2B4D] focus:ring-4 focus:ring-[#8E2B4D]/10" placeholder="A quick note about your workflow" /></label><label aria-hidden="true" className="hidden">Website<input tabIndex="-1" autoComplete="off" value={demoForm.website} onChange={(event) => setDemoForm((old) => ({ ...old, website: event.target.value }))} /></label><button disabled={demoBusy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6D1A36] px-5 text-sm font-bold text-cream-soft transition hover:bg-[#4A0F24] disabled:opacity-60 sm:col-span-2">{demoBusy ? 'Sending request…' : 'Request a walkthrough'} <ArrowRight size={15} /></button></form>
      </div>
    </div></section>

    <section className="px-5 pb-14 sm:px-8 sm:pb-16"><div className="mx-auto max-w-[1240px] overflow-hidden rounded-[24px] border border-burgundy/10 bg-pink-light/45 px-6 py-9 text-center text-ink sm:px-12 sm:py-10"><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-burgundy-light">Your next chapter starts here</p><h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl font-bold tracking-[-.035em] text-ink sm:text-4xl">Make recurring business feel a little more effortless.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/65">Bring your team, your customers, and your billing workflow into one thoughtful workspace.</p><Link to="/signup" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-burgundy px-5 text-sm font-bold text-cream-soft transition hover:-translate-y-px hover:bg-burgundy-dark">Create your account <ArrowRight size={16} /></Link></div></section>

    <footer className="relative overflow-hidden border-t border-burgundy/10 bg-cream-soft text-ink/70">
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-36 h-80 w-80 rounded-full bg-pink-light/45 blur-[100px]" />
      <div className="relative mx-auto max-w-[1240px] px-5 pb-6 pt-10 sm:px-8 sm:pt-12">
        <div className="grid gap-8 pb-8 sm:grid-cols-2 lg:grid-cols-[1.25fr_.75fr_.75fr] lg:gap-12">
          <div className="max-w-sm">
            <Link to="/home" aria-label="Darkside Subscriptions home" className="inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy focus-visible:ring-offset-4 focus-visible:ring-offset-cream-soft"><BrandLogo /></Link>
            <p className="mt-4 text-sm leading-6 text-ink/60">Subscriptions, billing, and customer relationships in one clear view.</p>
            <Link to="/signup" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-burgundy/15 bg-burgundy/5 px-4 text-sm font-bold text-burgundy transition hover:border-burgundy/35 hover:bg-pink-light/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy">Get started <ArrowRight size={15} /></Link>
          </div>
          <nav aria-label="Explore Darkside" className="space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-burgundy-light">Explore</p>
            <div className="flex flex-col items-start gap-3 text-sm font-medium">
              <a className="transition hover:text-burgundy" href="#platform">Platform</a>
              <a className="transition hover:text-burgundy" href="#about">About</a>
              <a className="transition hover:text-burgundy" href="#insights">Insights</a>
              <a className="transition hover:text-burgundy" href="#contact">Request a demo</a>
            </div>
          </nav>
          <nav aria-label="Account links" className="space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-burgundy-light">Your account</p>
            <div className="flex flex-col items-start gap-3 text-sm font-medium">
              <Link className="transition hover:text-burgundy" to="/login">Sign in</Link>
              <Link className="transition hover:text-burgundy" to="/signup">Create an account</Link>
            </div>
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t border-burgundy/10 pt-5 text-[11px] text-ink/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Darkside Subscriptions</p>
          <p>Recurring business, in sync.</p>
        </div>
      </div>
    </footer>
  </main>;
}
