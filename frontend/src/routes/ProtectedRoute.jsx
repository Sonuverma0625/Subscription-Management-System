import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { GlassCard } from '../components/ui/GlassCard.jsx';

function LoadingState() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream p-6">
      <GlassCard className="w-full max-w-sm p-8 text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-pink-light" />
        <p className="mt-4 text-sm font-semibold text-ink">Restoring your secure session…</p>
      </GlassCard>
    </main>
  );
}

export function ProtectedRoute() {
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);
  if (!initialized) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function PublicOnlyRoute({ children }) {
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);
  if (!initialized) return <LoadingState />;
  if (user) return <Navigate to={user.role === 'CUSTOMER' ? '/portal' : '/app'} replace />;
  return children;
}
