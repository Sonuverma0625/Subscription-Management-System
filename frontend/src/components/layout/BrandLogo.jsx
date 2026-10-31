export function BrandLogo({ subtitle = 'SUBSCRIPTIONS', light = false, className = '' }) {
  const textTone = light ? 'text-cream-soft' : 'text-ink';
  const markTone = light ? 'bg-white/10 text-[#EADBC3]' : 'bg-[#6D1A36] text-[#EADBC3]';

  return (
    <span role="img" aria-label={`Darkside ${subtitle || ''}`.trim()} className={`inline-flex items-center gap-2.5 ${className}`}>
      <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${markTone}`}>
        <svg viewBox="0 0 40 40" className="h-6 w-6" fill="none">
          <path d="M25.8 6.8a13.4 13.4 0 1 0 7.1 24.8A15.2 15.2 0 0 1 25.8 6.8Z" fill="currentColor" />
          <path d="M7.8 22.6A14.7 14.7 0 0 1 30 9.8" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
          <path d="m27 7.3 4.1 2.1-3.8 2.4" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="11.4" cy="30.4" r="1.5" fill="currentColor" />
        </svg>
      </span>
      <span className={`flex min-w-0 flex-col leading-none ${textTone}`}>
        <span className="font-display text-base font-extrabold tracking-tight">Darkside</span>
        {subtitle && <span className={`mt-1 text-[9px] font-bold uppercase tracking-[.16em] ${light ? 'text-cream-soft/60' : 'text-[#6D1A36]/65'}`}>{subtitle}</span>}
      </span>
    </span>
  );
}
