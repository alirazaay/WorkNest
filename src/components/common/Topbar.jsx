import { Bell, Menu, Settings, UserRound } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Topbar({ user, onNotifications, onMenu, onLogout, onSettings }) {
  const [menuOpen, setMenuOpen] = useState(false); const navigate = useNavigate();
  const name = user?.user?.name || 'Amara Mensah';
  return <header className="app-header"><button type="button" className="mobile-menu-button" onClick={onMenu} aria-label="Open navigation"><Menu size={21} /></button><div className="command-search"><input aria-label="Search workspace" placeholder="Search people, departments..." /></div><div className="header-actions"><button type="button" onClick={() => { onNotifications?.(); navigate('/notifications'); }} aria-label="Notifications" className="notification-button"><Bell size={17} /><i className="notification-dot" /></button><div className="profile-menu-wrap"><button type="button" className="profile-trigger" onClick={() => setMenuOpen(current => !current)} aria-expanded={menuOpen}><Avatar name={name} src={user?.user?.avatarUrl} /><span>{name}</span></button>{menuOpen && <div className="profile-menu"><strong>{name}</strong><small>{user?.user?.role || 'Administrator'}</small><button type="button" onClick={() => { onSettings?.(); setMenuOpen(false); }}><Settings size={15} />Settings</button><button type="button" onClick={() => { onLogout?.(); setMenuOpen(false); }}><UserRound size={15} />Sign out</button></div>}</div></div></header>;
}
