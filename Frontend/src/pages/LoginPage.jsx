import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { AuthFrame } from '../components/layout/AuthFrame.jsx';
import { useAuthStore } from '../store/authStore.js';
import { getErrorMessage } from '../utils/errors.js';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address.'), password: z.string().min(1, 'Enter your password.') });

export function LoginPage() {
  const login = useAuthStore((state) => state.login);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  async function submit(values) {
    setBusy(true);
    try {
      const user = await login({ ...values, email: values.email.trim().toLowerCase() });
      toast.success(`Welcome back, ${user.name}.`);
      navigate(user.role === 'CUSTOMER' ? '/portal' : '/app', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to sign in. Check your email and password.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame eyebrow="Welcome back" title="Sign in to Darkside" description="Use your Darkside account to continue to your workspace." footer={<>New to Darkside? <Link className="font-bold text-burgundy hover:underline" to="/signup">Create a customer account</Link></>}>
      <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
        <Input label="Email address" type="email" autoComplete="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
        <div>
          <div className="relative">
            <Input label="Password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" error={errors.password?.message} className="pr-12" {...register('password')} />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              title={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-2 top-[30px] inline-flex size-11 items-center justify-center rounded-xl text-ink/55 transition hover:bg-burgundy/5 hover:text-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burgundy/40"
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
          <div className="mt-2 text-right"><Link to="/forgot-password" className="text-sm font-semibold text-burgundy hover:underline">Forgot password?</Link></div>
        </div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </AuthFrame>
  );
}
