import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import Toast from './Toast.jsx';
import { NAV_PATHS } from '../../config/routes.js';

/**
 * AppShell — shared layout wrapper for all authenticated pages.
 *
 * Eliminates copy-pasted Sidebar + Topbar + Toast + mobile state from every page.
 * Usage:
 *   <AppShell user={user} active="People" onExit={onExit}>
 *     <YourPageContent />
 *   </AppShell>
 */
export default function AppShell({ user, active, onExit, children }) {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [message, setMessage] = useState('');

  function notify(text) {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2400);
  }

  function handleNavigate(label) {
    setMobileOpen(false);
    navigate(NAV_PATHS[label] || '/dashboard');
  }

  return (
    <div className="app">
      <Sidebar
        active={active}
        role={user?.user?.role || 'employee'}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onNavigate={handleNavigate}
        onLogout={onExit}
      />
      <div className="app-content">
        <Topbar
          user={user}
          onMenu={() => setMobileOpen(true)}
          onNotifications={() => navigate('/notifications')}
          onSettings={() => navigate('/settings')}
          onLogout={onExit}
        />
        <main className="dashboard-main">
          {typeof children === 'function' ? children({ notify }) : children}
        </main>
      </div>
      <Toast message={message} onClose={() => setMessage('')} />
    </div>
  );
}
