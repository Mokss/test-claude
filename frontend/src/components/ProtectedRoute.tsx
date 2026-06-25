import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../store/auth.ts';
import type { UserRole } from '../types.ts';

interface Props {
  role?: UserRole;
}

export function ProtectedRoute({ role }: Props) {
  const { token, user } = useAuthStore();

  if (!token || !user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />;
  }

  return <Outlet />;
}
