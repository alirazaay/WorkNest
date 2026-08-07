import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar.jsx';
import Topbar from '../../components/common/Topbar.jsx';
import Toast from '../../components/common/Toast.jsx';
import DashboardPage from './ResilientDashboardPage.jsx';

const paths = { Overview: '/dashboard', People: '/employees', Attendance: '/attendance', 'Time off': '/leaves', Payroll: '/payroll', Departments: '/departments', Settings: '/settings' };

export default function DashboardWorkspacePage({ user, onExit }) {
  const navigate = useNavigate(); const [mobileOpen, setMobileOpen] = useState(false); const [message, setMessage] = useState(''); const role = user?.user?.role || 'admin';
  function notify(text) { setMessage(text); window.setTimeout(() => setMessage(''), 2200); }
  return <div className="app"><Sidebar active="Overview" role={role} open={mobileOpen} onClose={() => setMobileOpen(false)} onNavigate={label => navigate(paths[label] || '/dashboard')} onLogout={onExit} /><div className="app-content"><Topbar user={user} onMenu={() => setMobileOpen(true)} onNotifications={() => notify('You are all caught up')} onSettings={() => navigate('/settings')} onLogout={onExit} /><main className="dashboard-main"><DashboardPage user={user} /></main></div><Toast message={message} onClose={() => setMessage('')} /></div>;
}
