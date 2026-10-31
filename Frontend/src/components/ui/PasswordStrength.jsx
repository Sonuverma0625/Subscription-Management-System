import { Check, Circle } from 'lucide-react';
import { getPasswordChecks } from '../../utils/password.js';

export function PasswordStrength({ password }) {
  const checks = getPasswordChecks(password);
  const passedCount = checks.filter((check) => check.passed).length;
  return (
    <div className="mt-3 rounded-2xl border border-burgundy/10 bg-cream-soft/80 p-4" aria-live="polite">
      <div className="mb-3 flex items-center justify-between text-xs">
        <span className="font-semibold text-ink">Password strength</span>
        <span className="font-medium text-burgundy">{passedCount === 4 ? 'Strong' : password ? `${passedCount} of 4 checks` : 'Add a password'}</span>
      </div>
      <div className="mb-3 flex gap-1.5" aria-hidden="true">
        {checks.map((check) => <span key={check.label} className={`h-1.5 flex-1 rounded-full ${check.passed ? 'bg-burgundy' : 'bg-pink-light'}`} />)}
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {checks.map((check) => (
          <li key={check.label} className={`flex items-center gap-2 text-xs ${check.passed ? 'text-burgundy' : 'text-ink/[0.55]'}`}>
            {check.passed ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}{check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
