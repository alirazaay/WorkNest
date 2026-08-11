import { Outlet } from 'react-router-dom';
import AccessDeniedPage from '../pages/app/AccessDeniedPage.jsx';

export default function RoleRoute({ user, allowedRoles = [] }) {
  const role = user?.user?.role || user?.role;
  return allowedRoles.includes(role) ? <Outlet /> : <AccessDeniedPage />;
}
