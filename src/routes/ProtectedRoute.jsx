import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ user, loading = false }) {
  const location = useLocation();
  if (loading) return null;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
