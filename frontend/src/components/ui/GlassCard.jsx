export function GlassCard({ className = '', children, ...props }) {
  return (
    <section className={`rounded-panel border border-burgundy/10 bg-white/85 shadow-sm backdrop-blur-xl ${className}`} {...props}>
      {children}
    </section>
  );
}
