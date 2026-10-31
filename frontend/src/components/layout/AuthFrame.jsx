import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo.jsx';

export function AuthFrame({ eyebrow, title, description, children, footer }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-cream px-3 py-6 sm:px-8 sm:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute -left-36 -top-36 h-[36rem] w-[36rem] rounded-full bg-pink-light/70 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-44 -right-32 h-[38rem] w-[38rem] rounded-full bg-burgundy/20 blur-[110px]" />
      <motion.div initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.42, ease: 'easeOut' }} className="relative grid w-full max-w-5xl overflow-hidden rounded-[22px] border border-burgundy/10 bg-cream-soft/80 shadow-glass backdrop-blur-xl sm:rounded-[28px] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden flex-col justify-between border-r border-burgundy/10 bg-gradient-to-br from-pink-light/45 via-cream to-cream-deep/55 p-8 text-ink lg:flex xl:p-10">
          <BrandLogo />
          <div className="max-w-sm">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-burgundy-light">Subscription workspace</p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight">A calmer way to manage recurring business.</h2>
            <p className="mt-4 leading-7 text-ink/65">Secure access for your team and customers, with every account in its own lane.</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-ink/70"><ArrowUpRight size={16} /> Built for Darkside</div>
        </section>
        <section className="p-5 sm:p-8 lg:p-10 xl:p-11">
          <div className="mb-5 inline-flex rounded-xl border border-pink/[0.35] bg-cream-soft/80 px-3 py-1.5 lg:hidden"><BrandLogo /></div>
          <div className="mb-4 flex justify-end"><Link to="/home" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-burgundy/70 transition hover:bg-burgundy/5 hover:text-burgundy"><ArrowLeft size={14} /> Back to home</Link></div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-burgundy/70">{eyebrow}</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-ink/[0.65]">{description}</p>
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 border-t border-burgundy/10 pt-4 text-sm text-ink/[0.65]">{footer}</div>}
        </section>
      </motion.div>
      <footer className="relative mt-5 text-center text-xs font-medium text-ink/45">© {new Date().getFullYear()} Darkside</footer>
    </main>
  );
}
