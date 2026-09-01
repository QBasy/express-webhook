import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.status !== 'approved') return <Navigate to="/login" replace />;

  return <Outlet />;
}

// Admin-only функции (см. RFC раздел 3): пока по единственному признаку role==='admin' —
// отдельного power-флага в модели пользователя ещё нет.
export function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  return <Outlet />;
}
