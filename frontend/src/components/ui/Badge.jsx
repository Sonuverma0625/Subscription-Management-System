const variants = {
  success: 'bg-status-paid/[0.10] text-status-paid',
  muted: 'bg-cream-deep/55 text-burgundy-dark',
  accent: 'bg-burgundy/[0.08] text-burgundy',
};

export function Badge({ children, variant = 'muted', className = '' }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.09em] ${variants[variant]} ${className}`}>{children}</span>;
}
