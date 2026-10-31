import { useEffect, useState } from 'react';
import { settingsApi } from '../api/settings.js';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { GlassCard } from '../components/ui/GlassCard.jsx';
import { Input } from '../components/ui/Input.jsx';
import { getErrorMessage } from '../utils/errors.js';
import toast from 'react-hot-toast';
import { Building2, Save } from 'lucide-react';

export function SettingsPage() {
  const [form, setForm] = useState({ companyName: '', companyEmail: '', companyAddress: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    settingsApi.getCompany().then(({ data }) => { if (active) setForm({ companyName: data.data.settings.companyName || '', companyEmail: data.data.settings.companyEmail || '', companyAddress: data.data.settings.companyAddress || '' }); })
      .catch((error) => toast.error(getErrorMessage(error, 'Could not load company settings.')))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try { const { data } = await settingsApi.updateCompany(form); setForm({ companyName: data.data.settings.companyName, companyEmail: data.data.settings.companyEmail, companyAddress: data.data.settings.companyAddress || '' }); toast.success('Company settings saved. New invoice PDFs use these details.'); }
    catch (error) { toast.error(getErrorMessage(error, 'Could not save company settings.')); }
    finally { setSaving(false); }
  }

  return <div className="workspace-page mx-auto max-w-4xl space-y-5">
    <div><Badge variant="accent">ADMINISTRATION</Badge><h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">Company settings</h1><p className="mt-2 text-sm leading-6 text-ink/65">Update the company details that appear on invoice PDFs.</p></div>
    <GlassCard className="p-6 sm:p-8"><div className="mb-6 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-pink-light/55 text-burgundy"><Building2 size={20} /></span><div><h2 className="font-display text-lg font-bold text-ink">Invoice identity</h2><p className="mt-1 text-xs text-ink/55">Settings are stored in the database.</p></div></div>
      <form onSubmit={save} className="space-y-4"><Input label="Company name" required maxLength={160} value={form.companyName} onChange={(event) => setForm((old) => ({ ...old, companyName: event.target.value }))} /><Input label="Billing email" type="email" required value={form.companyEmail} onChange={(event) => setForm((old) => ({ ...old, companyEmail: event.target.value }))} /><label className="block text-sm font-semibold text-ink">Company address<textarea maxLength={1000} rows="4" value={form.companyAddress} onChange={(event) => setForm((old) => ({ ...old, companyAddress: event.target.value }))} className="mt-2 w-full rounded-2xl border border-burgundy/15 bg-white/75 px-4 py-3 text-sm outline-none focus:border-burgundy/50 focus:ring-4 focus:ring-burgundy/10" /></label><Button type="submit" disabled={loading || saving}><Save size={16} />{saving ? 'Saving…' : 'Save settings'}</Button></form>
    </GlassCard>
  </div>;
}
