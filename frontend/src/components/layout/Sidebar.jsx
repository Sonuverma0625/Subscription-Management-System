import { Activity, BadgePercent, BarChart3, Bell, ClipboardList, FileText, LayoutDashboard, Mail, Package, ReceiptText, ScrollText, Settings, ShieldCheck, UserRound, UsersRound, WandSparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export function Sidebar({ role }) {
  const isCustomer = role === 'CUSTOMER';
  const items = isCustomer
    ? [
      { to: '/portal', label: 'Customer portal', Icon: UserRound },
      { to: '/notifications', label: 'Notifications', Icon: Bell },
      { to: '/subscriptions', label: 'Subscriptions', Icon: ClipboardList },
      { to: '/invoices', label: 'Invoices', Icon: ReceiptText },
    ]
    : [
      { to: '/app', label: 'Dashboard', Icon: LayoutDashboard },
      { to: '/subscriptions', label: 'Subscriptions', Icon: ClipboardList },
      { to: '/invoices', label: 'Invoices', Icon: ReceiptText },
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

  return (
    <aside className="sticky top-4 hidden h-fit w-56 shrink-0 rounded-2xl border border-burgundy/10 bg-white/90 p-2.5 shadow-sm backdrop-blur-xl lg:block">
      <p className="px-3 pb-2 pt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-burgundy/60">Workspace</p>
      <div className="max-h-[calc(100vh-11rem)] space-y-0.5 overflow-y-auto">
      {items.map(({ to, label, Icon }) => <NavLink key={to} to={to} end className={({ isActive }) => `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${isActive ? 'bg-burgundy text-cream-soft shadow-sm shadow-burgundy/[0.12]' : 'text-ink/75 hover:bg-cream/70 hover:text-ink'}`}>
        <Icon size={17} /> {label}
      </NavLink>)}
      </div>
      <div className="mx-2 mt-3 rounded-xl border border-burgundy/[0.08] bg-cream-soft/60 p-2.5">
        <p className="text-xs font-semibold text-ink">Signed in as</p>
        <p className="mt-1 break-all text-xs text-ink/[0.65]">{role.toLowerCase()}</p>
      </div>
    </aside>
  );
}
