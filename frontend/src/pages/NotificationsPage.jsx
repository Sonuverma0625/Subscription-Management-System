import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight, Circle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationsApi } from '../api/notifications.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { GlassCard } from '../components/ui/GlassCard.jsx';
import { getErrorMessage } from '../utils/errors.js';

const fmtDate = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notificationsApi.list({ limit: 60 });
      setItems(data.data);
      setUnread(data.meta.unread);
    } catch (error) { toast.error(getErrorMessage(error, 'Could not load notifications.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function markRead(item) {
    if (item.readAt) return;
    try {
      await notificationsApi.read(item.id);
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row));
      setUnread((count) => Math.max(0, count - 1));
    } catch (error) { toast.error(getErrorMessage(error, 'Could not update notification.')); }
  }
  async function markAllRead() {
    try {
      await notificationsApi.readAll();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnread(0);
      toast.success('All caught up.');
    } catch (error) { toast.error(getErrorMessage(error, 'Could not update notifications.')); }
  }

  return <div className="workspace-page mx-auto max-w-4xl space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><Badge variant="accent">INBOX</Badge><h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">Notifications</h1><p className="mt-2 text-sm text-ink/60">Renewal reminders, payment updates, and account activity.</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</Button><Button variant="ghost" onClick={() => void markAllRead()} disabled={!unread}><CheckCheck size={15} /> Mark all read</Button></div></div>
    <GlassCard className="overflow-hidden"><div className="flex items-center justify-between border-b border-burgundy/10 px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#EBCBD1] text-burgundy"><Bell size={18} /></span><div><p className="font-semibold text-ink">Your updates</p><p className="text-xs text-ink/55">{unread} unread</p></div></div></div>
      {loading ? <p className="p-8 text-sm text-ink/55">Loading notifications…</p> : items.length ? <div className="divide-y divide-burgundy/5">{items.map((item) => <article key={item.id} className={`flex gap-3 p-5 transition ${item.readAt ? 'bg-white/15' : 'bg-white/45'}`}><div className="pt-1">{item.readAt ? <Circle size={10} className="text-ink/20" /> : <span className="block h-2.5 w-2.5 rounded-full bg-burgundy" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold text-ink">{item.title}</h2><p className="mt-1 text-sm leading-6 text-ink/65">{item.body}</p><p className="mt-2 text-[11px] font-medium text-ink/45">{fmtDate(item.createdAt)}</p></div>{!item.readAt && <button type="button" onClick={() => void markRead(item)} className="text-xs font-bold text-burgundy hover:underline">Mark read</button>}</div>{item.href && <Link to={item.href} onClick={() => void markRead(item)} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-burgundy">View details <ChevronRight size={14} /></Link>}</div></article>)}</div> : <div className="p-10 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-cream-soft text-burgundy"><CheckCheck size={21} /></span><h2 className="mt-4 font-display text-lg font-bold text-ink">You’re all caught up</h2><p className="mt-2 text-sm text-ink/55">New account updates will show up here.</p></div>}
    </GlassCard>
  </div>;
}
