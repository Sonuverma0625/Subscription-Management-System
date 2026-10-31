import { useCallback, useEffect, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { auditApi } from '../api/audit.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { GlassCard } from '../components/ui/GlassCard.jsx';
import { Input } from '../components/ui/Input.jsx';
import { getErrorMessage } from '../utils/errors.js';

const fmtDate = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export function AuditLogsPage() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await auditApi.list({
        page, limit: 25,
        ...(search ? { search } : {}), ...(entity ? { entity } : {}),
        ...(from ? { from: new Date(`${from}T00:00:00.000Z`).toISOString() } : {}),
        ...(to ? { to: new Date(`${to}T23:59:59.999Z`).toISOString() } : {}),
      });
      setItems(data.data); setMeta(data.meta);
    } catch (error) { toast.error(getErrorMessage(error, 'Could not load the audit history.')); }
    finally { setLoading(false); }
  }, [page, search, entity, from, to]);
  useEffect(() => { void load(); }, [load]);
  function submitSearch(event) { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }

  return <div className="workspace-page mx-auto max-w-7xl space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><Badge variant="accent">SECURITY & HISTORY</Badge><h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">Audit log</h1><p className="mt-2 text-sm text-ink/60">Search who changed subscription and billing records, and when.</p></div><div className="inline-flex items-center gap-2 rounded-full border border-burgundy/10 bg-white/55 px-4 py-2 text-xs font-semibold text-burgundy"><Activity size={14} /> {meta.total} events</div></div>
    <GlassCard className="p-4"><form onSubmit={submitSearch} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_170px_170px_170px_auto]"><div className="relative"><Input aria-label="Search audit log" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search action, user, record ID" className="min-h-10 py-2 pl-10" /><Search size={15} className="pointer-events-none -mt-7 ml-4 text-ink/40" /></div><select aria-label="Filter by entity" value={entity} onChange={(event) => { setPage(1); setEntity(event.target.value); }} className="min-h-10 rounded-xl border border-burgundy/15 bg-white/75 px-3 text-sm"><option value="">All entities</option>{['Subscription', 'Invoice', 'Payment', 'CompanySettings', 'DemoRequest', 'User', 'Product', 'Plan', 'Tax', 'Discount', 'QuotationTemplate'].map((value) => <option key={value}>{value}</option>)}</select><Input aria-label="Start date" type="date" value={from} onChange={(event) => { setPage(1); setFrom(event.target.value); }} /><Input aria-label="End date" type="date" value={to} onChange={(event) => { setPage(1); setTo(event.target.value); }} /><Button type="submit" className="min-h-10">Search</Button></form></GlassCard>
    <GlassCard className="overflow-hidden"><div className="divide-y divide-burgundy/5">{loading && <p className="p-8 text-center text-sm text-ink/55">Loading audit history…</p>}{!loading && items.map((item) => <article key={item.id} className="grid gap-3 p-4 sm:grid-cols-[170px_1fr_auto] sm:items-start sm:p-5"><div><p className="text-xs font-semibold text-ink">{fmtDate(item.createdAt)}</p><p className="mt-1 text-[11px] text-ink/50">{item.user.name}</p><p className="text-[11px] text-ink/45">{item.user.email}</p></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="muted">{item.entity}</Badge><h2 className="break-all text-sm font-bold text-ink">{item.action}</h2></div><p className="mt-2 break-all text-xs text-ink/55">Record {item.entityId}</p>{item.details && <pre className="mt-2 max-w-full overflow-x-auto rounded-xl bg-cream-soft/80 p-3 text-[11px] leading-5 text-ink/65">{JSON.stringify(item.details, null, 2)}</pre>}</div></article>)}{!loading && items.length === 0 && <div className="p-10 text-center"><p className="font-semibold text-ink">No matching activity</p><p className="mt-1 text-sm text-ink/55">Try a different search or date range.</p></div>}</div><div className="flex flex-col gap-3 border-t border-burgundy/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="text-xs text-ink/55">Page {meta.page} of {Math.max(1, meta.pages)}</p><div className="flex gap-2"><Button variant="secondary" className="min-h-10 flex-1 justify-center px-3 sm:min-h-9 sm:flex-none" disabled={page <= 1 || loading} onClick={() => setPage((old) => Math.max(1, old - 1))}><ChevronLeft size={15} /> Previous</Button><Button variant="secondary" className="min-h-10 flex-1 justify-center px-3 sm:min-h-9 sm:flex-none" disabled={page >= meta.pages || loading} onClick={() => setPage((old) => old + 1)}>Next <ChevronRight size={15} /></Button></div></div></GlassCard>
  </div>;
}
