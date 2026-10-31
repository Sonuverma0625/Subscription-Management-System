import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { authApi } from '../api/auth.js';
import { AuthFrame } from '../components/layout/AuthFrame.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { PasswordStrength } from '../components/ui/PasswordStrength.jsx';
import { getErrorMessage } from '../utils/errors.js';

const schema = z.object({
  password: z.string().min(9, 'Use more than 8 characters.').regex(/[A-Z]/, 'Add an uppercase letter.').regex(/[a-z]/, 'Add a lowercase letter.').regex(/[^A-Za-z0-9]/, 'Add a special character.'),
});

export function ResetPasswordPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema), defaultValues: { password: '' } });
  const password = watch('password');

  async function submit(values) {
    setBusy(true);
    try {
      const { data } = await authApi.resetPassword(token, values);
      toast.success(data.message);
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error, 'This reset link is no longer valid. Request another one.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame eyebrow="Secure account recovery" title="Choose a new password" description="Your reset link is single use and expires 30 minutes after it was requested." footer={<Link className="font-bold text-burgundy hover:underline" to="/forgot-password">Request another reset link</Link>}>
      <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
        <div>
          <Input label="New password" type="password" autoComplete="new-password" placeholder="Create a strong password" error={errors.password?.message} {...register('password')} />
          <PasswordStrength password={password} />
        </div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Updating password…' : 'Update password'}</Button>
      </form>
    </AuthFrame>
  );
}
