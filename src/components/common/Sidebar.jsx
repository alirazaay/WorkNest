import { useEffect, useState } from 'react';
import { BarChart3, Bell, BriefcaseBusiness, CalendarDays, Clock3, Gauge, LogOut, Settings, Users, WalletCards, X } from 'lucide-react';
import api from '../../services/api.js';
import Logo from './Logo.jsx';

export default function Sidebar({ active, role = 'admin', companyName: providedCompanyName, open = false, onNavigate, onLogout, onClose }) {
  const [companyName, setCompanyName] = useState(providedCompanyName || 'WorkNest');
  useEffect(() => { if (providedCompanyName) return undefined; let mounted = true; api.get('/settings').then(response => { if (mounted) setCompanyName(response.data.data?.company?.companyName || 'WorkNest'); }).catch(() => {}); return () => { mounted = false; }; }, [providedCompanyName]);
  const allLinks = [['Overview', Gauge, ['admin', 'manager', 'employee']], ['FairRank', BarChart3, ['admin', 'manager', 'employee']], ['People', Users, ['admin', 'manager']], ['Attendance', Clock3, ['admin', 'manager', 'employee']], ['Time off', CalendarDays, ['admin', 'manager', 'employee']], ['Payroll', WalletCards, ['admin', 'manager', 'employee']], ['Departments', BriefcaseBusiness, ['admin']], ['Notifications', Bell, ['admin', 'manager', 'employee']], ['Settings', Settings, ['admin']]];
  const links = allLinks.filter(([, , roles]) => roles.includes(role));
  return <><div className={open ? 'sidebar-scrim visible' : 'sidebar-scrim'} onClick={onClose} /><aside className={open ? 'app-sidebar mobile-open' : 'app-sidebar'}><div className="sidebar-brand"><Logo /><button type="button" className="sidebar-close" onClick={onClose} aria-label="Close menu"><X size={18} /></button><span className="workspace">{companyName}</span></div><div className="sidebar-label">Workspace</div>{links.map(([label, Icon]) => <button type="button" key={label} className={active === label ? 'side-link active' : 'side-link'} onClick={() => { onNavigate(label); onClose?.(); }}><Icon size={17} />{label}</button>)}<div className="sidebar-bottom"><button type="button" className="side-link" onClick={onLogout}><LogOut size={17} />Sign out</button></div></aside></>;
}
