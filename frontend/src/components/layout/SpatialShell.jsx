import { useState } from 'react';
import { motion } from 'framer-motion';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { BackgroundOrbs } from './BackgroundOrbs.jsx';
import { FloatingDock } from './FloatingDock.jsx';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

export function SpatialShell() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
    } catch {
      // The local session is cleared even if the server cannot be reached.
    } finally {
      setBusy(false);
    }
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell relative min-h-screen overflow-hidden px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-16 sm:pt-4 lg:px-8">
      <BackgroundOrbs />
      <div className="mx-auto max-w-[1440px]">
        <Topbar user={user} onLogout={handleLogout} busy={busy} />
        <div className="mt-4 flex items-start gap-4 lg:mt-5">
          <Sidebar role={user.role} />
          <motion.main key={location.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="min-w-0 flex-1">
            <Outlet />
          </motion.main>
        </div>
      </div>
      <footer className="mx-auto mt-5 max-w-[1440px] border-t border-burgundy/10 px-1 py-3 text-center text-xs font-medium text-ink/45">© {new Date().getFullYear()} Darkside</footer>
      <FloatingDock role={user.role} />
    </div>
  );
}
