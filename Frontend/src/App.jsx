import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthFrame } from './components/layout/AuthFrame.jsx';
import { SpatialShell } from './components/layout/SpatialShell.jsx';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { ResetPasswordPage } from './pages/ResetPasswordPage.jsx';
import { SignupPage } from './pages/SignupPage.jsx';
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute.jsx';
import { RoleRoute } from './routes/RoleRoute.jsx';
import { useAuthStore } from './store/authStore.js';

const TeamPage = lazy(() => import('./pages/TeamPage.jsx').then((module) => ({ default: module.TeamPage })));
const HomePage = lazy(() => import('./pages/HomePage.jsx').then((module) => ({ default: module.HomePage })));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage.jsx').then((module) => ({ default: module.WorkspacePage })));
const CatalogPage = lazy(() => import('./pages/CatalogPage.jsx').then((module) => ({ default: module.CatalogPage })));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage.jsx').then((module) => ({ default: module.SubscriptionsPage })));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage.jsx').then((module) => ({ default: module.InvoicesPage })));
const PortalPage = lazy(() => import('./pages/PortalPage.jsx').then((module) => ({ default: module.PortalPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx').then((module) => ({ default: module.ReportsPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage.jsx').then((module) => ({ default: module.NotificationsPage })));
const DemoRequestsPage = lazy(() => import('./pages/DemoRequestsPage.jsx').then((module) => ({ default: module.DemoRequestsPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage.jsx').then((module) => ({ default: module.OnboardingPage })));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage.jsx').then((module) => ({ default: module.AuditLogsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx').then((module) => ({ default: module.SettingsPage })));

function LandingRedirect() {
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);
  if (!initialized) return <AuthFrame eyebrow="Darkside" title="Loading workspace" description="Restoring your secure session." />;
  return user ? <Navigate to={user.role === 'CUSTOMER' ? '/portal' : '/app'} replace /> : <HomePage />;
}

function AppRoutes() {
  const initialize = useAuthStore((state) => state.initialize);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    const onExpired = () => clearSession();
    window.addEventListener('brightloop:session-expired', onExpired);
    void initialize();
    return () => window.removeEventListener('brightloop:session-expired', onExpired);
  }, [initialize, clearSession]);

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '16px', background: '#FFF8EE', color: '#3B0D1E' } }} />
      <Suspense fallback={<AuthFrame eyebrow="Darkside" title="Opening workspace" description="Loading your secure workspace." />}>
      <Routes>
        <Route path="/" element={<LandingRedirect />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<SpatialShell />}>
            <Route path="/app" element={<RoleRoute allowedRoles={['ADMIN', 'STAFF']}><WorkspacePage /></RoleRoute>} />
            <Route path="/portal" element={<RoleRoute allowedRoles={['CUSTOMER']}><PortalPage /></RoleRoute>} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/team" element={<RoleRoute allowedRoles={['ADMIN']}><TeamPage /></RoleRoute>} />
            <Route path="/audit-logs" element={<RoleRoute allowedRoles={['ADMIN']}><AuditLogsPage /></RoleRoute>} />
            <Route path="/demo-requests" element={<RoleRoute allowedRoles={['ADMIN']}><DemoRequestsPage /></RoleRoute>} />
            <Route path="/onboarding" element={<RoleRoute allowedRoles={['ADMIN']}><OnboardingPage /></RoleRoute>} />
            <Route path="/products" element={<RoleRoute allowedRoles={['ADMIN', 'STAFF']}><CatalogPage type="products" /></RoleRoute>} />
            <Route path="/plans" element={<RoleRoute allowedRoles={['ADMIN', 'STAFF']}><CatalogPage type="plans" /></RoleRoute>} />
            <Route path="/templates" element={<RoleRoute allowedRoles={['ADMIN', 'STAFF']}><CatalogPage type="templates" /></RoleRoute>} />
            <Route path="/taxes" element={<RoleRoute allowedRoles={['ADMIN']}><CatalogPage type="taxes" /></RoleRoute>} />
            <Route path="/discounts" element={<RoleRoute allowedRoles={['ADMIN']}><CatalogPage type="discounts" /></RoleRoute>} />
            <Route path="/subscriptions" element={<RoleRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}><SubscriptionsPage /></RoleRoute>} />
            <Route path="/invoices" element={<RoleRoute allowedRoles={['ADMIN', 'STAFF', 'CUSTOMER']}><InvoicesPage /></RoleRoute>} />
            <Route path="/reports" element={<RoleRoute allowedRoles={['ADMIN', 'STAFF']}><ReportsPage /></RoleRoute>} />
            <Route path="/settings" element={<RoleRoute allowedRoles={['ADMIN']}><SettingsPage /></RoleRoute>} />
          </Route>
        </Route>
        <Route path="*" element={<LandingRedirect />} />
      </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}
