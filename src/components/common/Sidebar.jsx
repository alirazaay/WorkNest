import { BriefcaseBusiness, CalendarDays, Gauge, LogOut, Settings, Users, WalletCards, X } from 'lucide-react';
import Logo from './Logo.jsx';

export default function Sidebar({ active, role = 'admin', open = false, onNavigate, onLogout, onClose }) {
  const allLinks = [['Overview', Gauge, ['admin', 'manager', 'employee']], ['People', Users, ['admin', 'manager']], ['Time off', CalendarDays, ['admin', 'manager', 'employee']], ['Payroll', WalletCards, ['admin', 'employee']], ['Departments', BriefcaseBusiness, ['admin']], ['Settings', Settings, ['admin']]];
  const links = allLinks.filter(([, , roles]) => roles.includes(role));
  return <><div className={open ? 'sidebar-scrim visible' : 'sidebar-scrim'} onClick={onClose} /><aside className={open ? 'app-sidebar mobile-open' : 'app-sidebar'}><div className="sidebar-brand"><Logo /><button type="button" className="sidebar-close" onClick={onClose} aria-label="Close menu"><X size={18} /></button><span className="workspace">Acme Inc.</span></div><div className="sidebar-label">Workspace</div>{links.map(([label, Icon]) => <button key={label} className={active === label ? 'side-link active' : 'side-link'} onClick={() => { onNavigate(label); onClose?.(); }}><Icon size={17} />{label}</button>)}<div className="sidebar-bottom"><button className="side-link" onClick={onLogout}><LogOut size={17} />Sign out</button></div></aside></>;
}
