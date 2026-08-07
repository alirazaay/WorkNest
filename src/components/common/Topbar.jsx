import { Bell, Search } from 'lucide-react';
import Avatar from './Avatar.jsx';

export default function Topbar({ user, onNotifications }) {
  return <header className="app-header"><div className="command-search"><Search size={16} /><input aria-label="Search workspace" placeholder="Search people, departments..." /></div><div className="header-actions"><button type="button" onClick={onNotifications} aria-label="Notifications"><Bell size={17} /><i className="notification-dot" /></button><Avatar name={user?.user?.name || 'Amara Mensah'} /></div></header>;
}
