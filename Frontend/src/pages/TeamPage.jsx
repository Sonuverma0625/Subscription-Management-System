import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Search, ShieldCheck, UserPlus, UserRoundCheck, UserRoundX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { usersApi } from '../api/users.js';
import { GlassCard } from '../components/ui/GlassCard.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PasswordStrength } from '../components/ui/PasswordStrength.jsx';
import { getErrorMessage } from '../utils/errors.js';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Enter the staff member’s name.').max(120),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(9, 'Use more than 8 characters.').regex(/[A-Z]/, 'Add an uppercase letter.').regex(/[a-z]/, 'Add a lowercase letter.').regex(/[^A-Za-z0-9]/, 'Add a special character.'),
});

const emptyPage = { page: 1, limit: 20, total: 0, pages: 0 };

export function TeamPage() {
  const [members, setMembers] = useState([]);
  const [meta, setMeta] = useState(emptyPage);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({ resolver: zodResolver(createSchema), defaultValues: { name: '', email: '', password: '' } });
  const password = watch('password');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    usersApi.listStaff({ page, limit: 20, ...(search ? { search } : {}) })
      .then(({ data }) => {
        if (!active) return;
        setMembers(data.data);
        setMeta(data.meta);
      })
      .catch((error) => {
        if (active) toast.error(getErrorMessage(error, 'Could not load the team.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search]);

  async function createStaff(values) {
    setSaving(true);
    try {
      await usersApi.createStaff({ ...values, email: values.email.trim().toLowerCase() });
      toast.success('Staff account created.');
      reset();
      setPage(1);
      setSearch('');
      setSearchInput('');
      if (page === 1 && !search) {
        const { data } = await usersApi.listStaff({ page: 1, limit: 20 });
        setMembers(data.data);
        setMeta(data.meta);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not create the staff account.'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member) {
    try {
      await usersApi.setStaffActive(member.id, !member.isActive);
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, isActive: !item.isActive } : item));
      toast.success(member.isActive ? 'Staff account deactivated.' : 'Staff account activated.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update the staff account.'));
    }
  }

  return (
    <div className="workspace-page mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="accent">ADMINISTRATION</Badge>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">Team access</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink/[0.65]">Create staff accounts and control whether team members can sign in.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-burgundy/10 bg-white/55 px-4 py-2 text-sm font-semibold text-burgundy">
          <ShieldCheck size={17} /> Admin managed
        </div>
      </div>

      <GlassCard className="p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-pink-light/60 text-burgundy"><UserPlus size={19} /></span>
          <div><h2 className="font-display text-lg font-bold text-ink">Create staff account</h2><p className="mt-0.5 text-sm text-ink/60">Staff can sign in after you create their account.</p></div>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(createStaff)} noValidate>
          <Input label="Full name" autoComplete="name" placeholder="Staff member name" error={errors.name?.message} {...register('name')} />
          <Input label="Email address" type="email" autoComplete="email" placeholder="name@company.com" error={errors.email?.message} {...register('email')} />
          <div className="md:col-span-2">
            <Input label="Temporary password" type="password" autoComplete="new-password" placeholder="Set a secure sign-in password" error={errors.password?.message} {...register('password')} />
            <PasswordStrength password={password} />
          </div>
          <div className="md:col-span-2"><Button type="submit" disabled={saving}><UserPlus size={16} />{saving ? 'Creating account…' : 'Create staff account'}</Button></div>
        </form>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-burgundy/10 p-5 sm:p-6">
          <div><h2 className="font-display text-lg font-bold text-ink">Staff members</h2><p className="mt-1 text-sm text-ink/60">{meta.total} account{meta.total === 1 ? '' : 's'}</p></div>
          <div className="w-full sm:w-72"><Input aria-label="Search team" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name or email" className="min-h-10 py-2 pl-10" /><Search size={16} className="pointer-events-none -mt-7 ml-4 text-ink/45" aria-hidden="true" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-cream-soft/75 text-xs uppercase tracking-wide text-burgundy/70">
              <tr><th scope="col" className="px-6 py-3 font-bold">Member</th><th scope="col" className="px-6 py-3 font-bold">Access</th><th scope="col" className="px-6 py-3 font-bold">Joined</th><th scope="col" className="px-6 py-3 font-bold">Status</th><th scope="col" className="px-6 py-3 text-right font-bold">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-burgundy/5">
              {loading && Array.from({ length: 3 }, (_, index) => <tr key={`skeleton-${index}`}><td colSpan="5" className="px-6 py-5"><div className="h-4 animate-pulse rounded-full bg-pink-light/50" /></td></tr>)}
              {!loading && members.map((member) => <tr key={member.id} className="hover:bg-cream-soft/45">
                <td className="px-6 py-4"><p className="font-semibold text-ink">{member.name}</p><p className="mt-0.5 text-xs text-ink/60">{member.email}</p></td>
                <td className="px-6 py-4"><Badge variant="muted">STAFF</Badge></td>
                <td className="px-6 py-4 whitespace-nowrap text-ink/65">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(member.createdAt))}</td>
                <td className="px-6 py-4"><Badge variant={member.isActive ? 'success' : 'muted'}>{member.isActive ? 'Active' : 'Inactive'}</Badge></td>
                <td className="px-6 py-4 text-right"><Button variant="ghost" className="min-h-9 px-3" onClick={() => void toggleActive(member)} aria-label={`${member.isActive ? 'Deactivate' : 'Activate'} ${member.name}`}>
                  {member.isActive ? <><UserRoundX size={16} /> Deactivate</> : <><UserRoundCheck size={16} /> Activate</>}
                </Button></td>
              </tr>)}
              {!loading && members.length === 0 && <tr><td colSpan="5" className="px-6 py-12 text-center"><p className="font-semibold text-ink">No staff accounts found</p><p className="mt-1 text-sm text-ink/60">Create a staff account above or adjust your search.</p></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-burgundy/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs font-medium text-ink/60">Page {meta.page} of {Math.max(meta.pages, 1)}</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="min-h-10 flex-1 justify-center px-3 sm:min-h-9 sm:flex-none" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /> Previous</Button>
            <Button variant="secondary" className="min-h-10 flex-1 justify-center px-3 sm:min-h-9 sm:flex-none" disabled={page >= meta.pages || loading} onClick={() => setPage((value) => value + 1)}>Next <ChevronRight size={16} /></Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
