import { Activity, BadgePercent, BarChart3, Bell, ClipboardList, FileText, LayoutDashboard, Mail, MoreHorizontal, Package, ReceiptText, ScrollText, Settings, ShieldCheck, UserRound, UsersRound, WandSparkles, X } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

export function FloatingDock({ role }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const isCustomer = role === 'CUSTOMER';
  const items = isCustomer
    ? [
      { to: '/portal', label: 'Portal', Icon: UserRound },
      { to: '/subscriptions', label: 'Subs', Icon: ClipboardList },
      { to: '/invoices', label: 'Invoices', Icon: ReceiptText },
    ]
    : [
      { to: '/app', label: 'Home', Icon: LayoutDashboard },
      { to: '/subscriptions', label: 'Subs', Icon: ClipboardList },
      { to: '/invoices', label: 'Invoices', Icon: ReceiptText },
    ];
  const moreItems = isCustomer
    ? [{ to: '/notifications', label: 'Notifications', Icon: Bell }]
    : [
      { to: '/reports', label: 'Reports', Icon: BarChart3 },
      { to: '/notifications', label: 'Notifications', Icon: Bell },
      { to: '/products', label: 'Products', Icon: Package },
      { to: '/plans', label: 'Plans', Icon: ScrollText },
      { to: '/templates', label: 'Quotation templates', Icon: FileText },
      ...(role === 'ADMIN' ? [
        { to: '/taxes', label: 'Taxes', Icon: ShieldCheck },
        { to: '/discounts', label: 'Discounts', Icon: BadgePercent },
        { to: '/team', label: 'Team', Icon: UsersRound },
        { to: '/demo-requests', label: 'Demo requests', Icon: Mail },
        { to: '/onboarding', label: 'Setup guide', Icon: WandSparkles },
        { to: '/audit-logs', label: 'Audit log', Icon: Activity },
        { to: '/settings', label: 'Settings', Icon: Settings },
      ] : []),
    ];

  useEffect(() => setMoreOpen(false), [location.pathname]);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [moreOpen]);

  return (
    <div className="fixed left-1/2 z-40 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-col items-center lg:hidden" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      {moreOpen && <nav id="mobile-more-menu" aria-label="More workspace navigation" className="mb-2 grid max-h-[min(60dvh,28rem)] w-[min(calc(100vw-1.5rem),24rem)] grid-cols-2 gap-1.5 overflow-y-auto rounded-2xl border border-burgundy/10 bg-cream-soft/95 p-2.5 shadow-glass backdrop-blur-2xl">
        {moreItems.map(({ to, label, Icon }) => <NavLink key={to} to={to} end onClick={() => setMoreOpen(false)} className={({ isActive }) => `flex min-h-11 min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold leading-4 transition ${isActive ? 'bg-burgundy text-cream-soft' : 'text-ink/75 hover:bg-cream/80 hover:text-burgundy'}`}>
          <Icon size={15} className="shrink-0" /><span className="min-w-0 whitespace-normal break-words">{label}</span>
        </NavLink>)}
      </nav>}
      <nav aria-label="Quick navigation" className="scrollbar-none flex max-w-full touch-pan-x overscroll-x-contain overflow-x-auto rounded-full border border-burgundy/10 bg-cream-soft/90 p-1.5 shadow-glass backdrop-blur-2xl">
        {items.map(({ to, label, Icon }) => <NavLink key={to} to={to} end title={label} aria-label={label} className={({ isActive }) => `flex min-w-[60px] flex-col items-center justify-center gap-1 rounded-full px-2.5 py-2 text-[10px] font-semibold ${isActive ? 'bg-burgundy text-cream-soft' : 'text-burgundy hover:bg-cream-soft'}`}>
          <Icon size={17} /> <span>{label}</span>
        </NavLink>)}
        <button type="button" aria-label={moreOpen ? 'Close more navigation' : 'Open more navigation'} aria-expanded={moreOpen} aria-controls="mobile-more-menu" onClick={() => setMoreOpen((open) => !open)} className={`flex min-w-[60px] flex-col items-center justify-center gap-1 rounded-full px-2.5 py-2 text-[10px] font-semibold transition ${moreOpen ? 'bg-burgundy text-cream-soft' : 'text-burgundy hover:bg-cream-soft'}`}>
          {moreOpen ? <X size={17} /> : <MoreHorizontal size={17} />}<span>More</span>
        </button>
      </nav>
    </div>
  );
}
