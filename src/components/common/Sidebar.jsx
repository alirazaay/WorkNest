import { BriefcaseBusiness, CalendarDays, Gauge, LogOut, Users, WalletCards } from 'lucide-react';
import Logo from './Logo.jsx';

export default function Sidebar({ active, onNavigate, onLogout }) {
  const links = [['Overview', Gauge], ['People', Users], ['Time off', CalendarDays], ['Payroll', WalletCards], ['Departments', BriefcaseBusiness]];
  return <aside className="app-sidebar"><div className="sidebar-brand"><Logo /><span className="workspace">Acme Inc.</span></div><div className="sidebar-label">Workspace</div>{links.map(([label, Icon]) => <button key={label} className={active === label ? 'side-link active' : 'side-link'} onClick={() => onNavigate(label)}><Icon size={17} />{label}</button>)}<div className="sidebar-bottom"><button className="side-link" onClick={onLogout}><LogOut size={17} />Sign out</button></div></aside>;
}
