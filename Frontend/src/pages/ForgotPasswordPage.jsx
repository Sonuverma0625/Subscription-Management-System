import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { authApi } from '../api/auth.js';
import { AuthFrame } from '../components/layout/AuthFrame.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { getErrorMessage } from '../utils/errors.js';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address.') });

export function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  async function submit(values) {
    setBusy(true);
    try {
      const { data } = await authApi.forgotPassword({ email: values.email.trim().toLowerCase() });
      setSent(true);
      toast.success(data.message);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to request a password reset right now.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame eyebrow="Account recovery" title="Reset your password" description={sent ? 'If an active account matches that email, a reset link will be sent shortly. Check your inbox.' : 'Enter the email address on your account. We will send a secure reset link if it matches an active account.'} footer={<Link className="font-bold text-burgundy hover:underline" to="/login">Back to sign in</Link>}>
      {!sent && <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
        <Input label="Email address" type="email" autoComplete="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Sending…' : 'Send reset link'}</Button>
      </form>}
    </AuthFrame>
  );
}
