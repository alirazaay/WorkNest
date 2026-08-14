import { useEffect, useState } from 'react';
import { BarChart3, Bell, BriefcaseBusiness, CalendarDays, Clock3, Gauge, LogOut, Settings, Users, WalletCards, X } from 'lucide-react';
import api from '../../services/api.js';
import Avatar from './Avatar.jsx';
import Logo from './Logo.jsx';

export default function Sidebar({ active, role = 'admin', user, companyName: providedCompanyName, open = false, onNavigate, onLogout, onClose }) {
  const [companyName, setCompanyName] = useState(providedCompanyName || 'WorkNest');
  useEffect(() => { if (providedCompanyName) return undefined; let mounted = true; api.get('/settings').then(response => { if (mounted) setCompanyName(response.data.data?.company?.companyName || 'WorkNest'); }).catch(() => {}); return () => { mounted = false; }; }, [providedCompanyName]);
  const allLinks = [['Overview', Gauge, ['admin', 'manager', 'employee']], ['FairRank', BarChart3, ['admin', 'manager', 'employee']], ['People', Users, ['admin', 'manager']], ['Attendance', Clock3, ['admin', 'manager', 'employee']], ['Time off', CalendarDays, ['admin', 'manager', 'employee']], ['Payroll', WalletCards, ['admin', 'manager', 'employee']], ['Departments', BriefcaseBusiness, ['admin']], ['Notifications', Bell, ['admin', 'manager', 'employee']], ['Settings', Settings, ['admin']]];
  const links = allLinks.filter(([, , roles]) => roles.includes(role));
  const account = user?.user || user || {};
  const accountName = account.name || account.fullName || account.email || 'Workspace member';
  const accountRole = String(account.role || 'Workspace member').replaceAll('_', ' ');
  return <><div className={open ? 'sidebar-scrim visible' : 'sidebar-scrim'} onClick={onClose} /><aside className={open ? 'app-sidebar mobile-open' : 'app-sidebar'}><div className="sidebar-brand"><Logo /><button type="button" className="sidebar-close" onClick={onClose} aria-label="Close menu"><X size={18} /></button><span className="workspace">{companyName}</span></div><div className="sidebar-nav" aria-label="Workspace navigation"><div className="sidebar-label">Workspace</div>{links.map(([label, Icon]) => <button type="button" key={label} className={active === label ? 'side-link active' : 'side-link'} aria-current={active === label ? 'page' : undefined} onClick={() => { onNavigate(label); onClose?.(); }}><Icon size={17} />{label}</button>)}</div><div className="sidebar-bottom"><div className="sidebar-account"><Avatar name={accountName} src={account.avatarUrl || account.avatar_url || account.profilePhotoUrl} /><span><strong>{accountName}</strong><small>{accountRole}</small></span></div><button type="button" className="side-link sidebar-signout" onClick={onLogout}><LogOut size={17} />Sign out</button></div></aside></>;
}
