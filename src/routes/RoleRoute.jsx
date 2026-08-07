import { Navigate, Outlet } from 'react-router-dom';

export default function RoleRoute({ user, allowedRoles = [] }) {
  const role = user?.user?.role || user?.role;
  return allowedRoles.includes(role) ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
