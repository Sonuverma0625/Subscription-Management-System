import { forwardRef } from 'react';

export const Input = forwardRef(function Input({ label, error, hint, id, className = '', ...props }, ref) {
  const inputId = id || props.name;
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-ink">{label}</label>}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`min-h-12 w-full rounded-2xl border bg-cream-soft/85 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-burgundy/50 focus:ring-4 focus:ring-burgundy/10 ${error ? 'border-burgundy ring-4 ring-burgundy/10' : 'border-burgundy/[0.15]'} ${className}`}
        {...props}
      />
      {error && <p id={`${inputId}-error`} className="mt-1.5 text-sm font-medium text-burgundy">{error}</p>}
      {!error && hint && <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-ink/60">{hint}</p>}
    </div>
  );
});
