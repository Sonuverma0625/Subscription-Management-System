import { forwardRef } from 'react';

const styles = {
  primary: 'bg-burgundy text-cream-soft shadow-sm shadow-burgundy/[0.12] hover:bg-burgundy-dark focus-visible:ring-burgundy',
  secondary: 'border border-burgundy/[0.14] bg-white/85 text-burgundy hover:bg-white focus-visible:ring-burgundy',
  ghost: 'bg-transparent text-burgundy hover:bg-burgundy/5 focus-visible:ring-burgundy',
};

export const Button = forwardRef(function Button({ variant = 'primary', className = '', ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 ${styles[variant]} ${className}`}
      {...props}
    />
  );
});
