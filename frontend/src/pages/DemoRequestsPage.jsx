import { useCallback, useEffect, useState } from 'react';
import { Badge } from '../components/ui/Badge.jsx';
import { GlassCard } from '../components/ui/GlassCard.jsx';
import { demoApi } from '../api/demo.js';
import { getErrorMessage } from '../utils/errors.js';
import toast from 'react-hot-toast';
import { Mail, RefreshCw } from 'lucide-react';

const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED'];
const fmtDate = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function DemoRequestsPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await demoApi.list({ page: 1, limit: 100, ...(status ? { status } : {}) }); setItems(data.data); }
    catch (error) { toast.error(getErrorMessage(error, 'Could not load demo requests.')); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);
  async function changeStatus(item, nextStatus) {
    try { await demoApi.updateStatus(item.id, nextStatus); toast.success('Request status updated.'); await load(); }
    catch (error) { toast.error(getErrorMessage(error, 'Could not update this request.')); }
  }
  return <div className="workspace-page mx-auto max-w-6xl space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><Badge variant="accent">ADMINISTRATION</Badge><h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">Demo requests</h1><p className="mt-2 text-sm text-ink/60">Follow up with teams that asked to see Darkside.</p></div><div className="flex items-center gap-2"><select aria-label="Filter demo requests by status" value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-10 rounded-full border border-burgundy/15 bg-white/75 px-4 text-sm"><option value="">All requests</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select><button type="button" onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-full border border-burgundy/10 bg-white text-burgundy" aria-label="Refresh demo requests"><RefreshCw size={15} /></button></div></div>
    <div className="grid gap-4">{loading && <GlassCard className="p-8 text-sm text-ink/55">Loading demo requests…</GlassCard>}{!loading && items.map((item) => <GlassCard key={item.id} className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-bold text-ink">{item.companyName}</h2><Badge variant={item.status === 'NEW' ? 'accent' : item.status === 'QUALIFIED' ? 'success' : 'muted'}>{item.status}</Badge></div><p className="mt-1 text-xs text-ink/55">{item.name} · {fmtDate(item.createdAt)}</p><a className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-burgundy hover:underline" href={`mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent('Darkside walkthrough')}`}><Mail size={14} /> {item.email}</a><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink/70">{item.message}</p></div><select aria-label={`Update request status for ${item.companyName}`} value={item.status} onChange={(event) => void changeStatus(item, event.target.value)} className="min-h-10 rounded-full border border-burgundy/15 bg-white px-3 text-xs font-semibold text-ink">{statuses.map((value) => <option key={value}>{value}</option>)}</select></div></GlassCard>)}{!loading && items.length === 0 && <GlassCard className="p-10 text-center"><p className="font-semibold text-ink">No demo requests yet</p><p className="mt-1 text-sm text-ink/55">Requests submitted from the public home page will show here.</p></GlassCard>}</div>
  </div>;
}
