import { Bell, LogOut } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { notificationsApi } from '../../api/notifications.js';
import { BrandLogo } from './BrandLogo.jsx';

export function Topbar({ user, onLogout, busy }) {
  const [unread, setUnread] = useState(0);
  const refreshUnread = useCallback(async () => {
    try { const { data } = await notificationsApi.list({ limit: 1 }); setUnread(data.meta.unread); }
    catch { /* Keep the workspace usable if the notification service is unavailable. */ }
  }, []);
  useEffect(() => {
    void refreshUnread();
    const timer = window.setInterval(() => void refreshUnread(), 60000);
    return () => window.clearInterval(timer);
  }, [refreshUnread]);
  return (
    <header className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-burgundy/10 bg-white/90 px-4 shadow-sm backdrop-blur-xl sm:px-5">
      <div className="min-w-0"><BrandLogo subtitle="SUBSCRIPTIONS" /></div>
      <div className="flex items-center gap-3">
        <Link to="/home" className="hidden rounded-full px-3 py-2 text-xs font-bold text-burgundy/70 transition hover:bg-burgundy/5 hover:text-burgundy sm:inline-flex">Website</Link>
        <Link to="/notifications" aria-label={`Notifications, ${unread} unread`} className="relative grid h-9 w-9 place-items-center rounded-xl border border-burgundy/10 bg-cream-soft/70 text-burgundy transition hover:bg-cream-soft"><Bell size={16} />{unread > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-burgundy px-1 text-[10px] font-bold text-cream-soft">{unread > 9 ? '9+' : unread}</span>}</Link>
        <span className="hidden text-right sm:block">
          <span className="block max-w-48 truncate text-sm font-semibold text-ink">{user.name}</span>
          <Badge variant={user.role === 'CUSTOMER' ? 'muted' : 'accent'}>{user.role}</Badge>
        </span>
        <Button variant="secondary" className="min-h-10 px-3 sm:px-4" onClick={onLogout} disabled={busy} aria-label="Sign out">
          <LogOut size={16} /> <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
