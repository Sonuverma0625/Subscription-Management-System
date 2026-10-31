import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { authApi } from '../api/auth.js';
import { AuthFrame } from '../components/layout/AuthFrame.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { PasswordStrength } from '../components/ui/PasswordStrength.jsx';
import { getErrorMessage } from '../utils/errors.js';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(9, 'Use more than 8 characters.').regex(/[A-Z]/, 'Add an uppercase letter.').regex(/[a-z]/, 'Add a lowercase letter.').regex(/[^A-Za-z0-9]/, 'Add a special character.'),
});

export function SignupPage() {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });
  const password = watch('password');

  async function submit(values) {
    setBusy(true);
    try {
      await authApi.register({ ...values, email: values.email.trim().toLowerCase() });
      toast.success('Account created. Sign in to continue.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to create your account.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame eyebrow="Customer registration" title="Create your account" description="Customer accounts can be created here. Darkside team accounts are managed by an administrator." footer={<>Already have an account? <Link className="font-bold text-burgundy hover:underline" to="/login">Sign in</Link></>}>
      <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
        <Input label="Email address" type="email" autoComplete="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
        <div>
          <Input label="Password" type="password" autoComplete="new-password" placeholder="Create a strong password" error={errors.password?.message} {...register('password')} />
          <PasswordStrength password={password} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Creating account…' : 'Create customer account'}</Button>
      </form>
    </AuthFrame>
  );
}
