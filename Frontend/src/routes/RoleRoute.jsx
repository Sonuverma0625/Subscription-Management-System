import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

export function RoleRoute({ allowedRoles, children }) {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'CUSTOMER' ? '/portal' : '/app'} replace />;
  }
  return children;
}
