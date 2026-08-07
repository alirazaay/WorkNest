import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import Sidebar from '../../components/common/Sidebar.jsx';
import Topbar from '../../components/common/Topbar.jsx';
import Modal from '../../components/common/Modal.jsx';
import Button from '../../components/common/Button.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Toast from '../../components/common/Toast.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';

const paths = { Overview: '/dashboard', People: '/employees', Attendance: '/attendance', 'Time off': '/leaves', Payroll: '/payroll', Departments: '/departments', Settings: '/settings' };
const sectionForPath = { '/dashboard': 'Overview', '/departments': 'Departments', '/employees': 'People', '/attendance': 'Attendance', '/leaves': 'Time off', '/payroll': 'Payroll', '/settings': 'Settings' };

export default function WorkspacePage({ user, onExit }) {
  const navigate = useNavigate();
  const location = useLocation();
  const section = sectionForPath[location.pathname] || 'Overview';
  const role = user?.user?.role || 'admin';
  const [modal, setModal] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadRecords() {
    setLoading(true); setError('');
    try { const [departmentResponse, employeeResponse] = await Promise.all([api.get('/departments'), api.get('/employees')]); setDepartments(departmentResponse.data.data || []); setEmployees(employeeResponse.data.data?.items || []); }
    catch (requestError) { setError(requestError.response?.data?.error?.message || 'Could not load workspace records.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadRecords(); }, []);
  function notify(text) { setMessage(text); window.setTimeout(() => setMessage(''), 2400); }
  function openEmployeeModal() { setModal('employee'); }
  async function submit(event) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    try {
      if (modal === 'department') { const response = await api.post('/departments', { name: data.get('name') }); setDepartments(current => [...current, response.data.data]); notify('Department added successfully'); }
      else { const response = await api.post('/employees', { name: data.get('name'), email: data.get('email'), password: data.get('password'), designation: data.get('role') || undefined, employmentType: 'full-time' }); setEmployees(current => [...current, response.data.data]); notify('Employee added successfully'); }
      setModal(null);
    } catch (requestError) { setError(requestError.response?.data?.error?.message || 'Could not save this record.'); }
  }

  const columns = [{ key: 'name', label: 'Employee', render: row => row.user?.name || row.name }, { key: 'email', label: 'Email', render: row => row.user?.email || row.email }, { key: 'designation', label: 'Role' }, { key: 'status', label: 'Status', render: row => <StatusBadge status={row.employmentStatus || row.status} /> }];
  const firstName = user?.user?.name?.split(' ')[0] || 'Amara';
  const go = label => navigate(paths[label] || '/dashboard');

  return <div className="app"><Sidebar active={section} role={role} open={mobileOpen} onClose={() => setMobileOpen(false)} onNavigate={go} onLogout={onExit} /><div className="app-content"><Topbar user={user} onMenu={() => setMobileOpen(true)} onNotifications={() => notify('You are all caught up')} onSettings={() => navigate('/settings')} onLogout={onExit} /><main className="dashboard-main">{error && <ErrorState message={error} onRetry={loadRecords} />}{!error && section === 'Departments' && <><Breadcrumbs items={[{ label: 'Workspace' }, { label: 'Departments' }]} /><div className="page-heading"><div><div className="eyebrow">Workspace / Manage</div><h1>Departments</h1><p>Shape the teams and spaces that make your organization work.</p></div><Button type="button" size="sm" onClick={() => setModal('department')}>+ Add department</Button></div><div className="department-grid">{departments.map(department => <div className="department-card" key={department.id}><div className="department-icon">⌘</div><h2>{department.name}</h2><p>Team space for your organization.</p><StatusBadge status="active">Active</StatusBadge></div>)}</div></>}{!error && section === 'People' && <><Breadcrumbs items={[{ label: 'Workspace' }, { label: 'People' }]} /><div className="page-heading"><div><div className="eyebrow">Workspace</div><h1>People</h1><p>Manage your organization’s employee directory.</p></div><Button type="button" size="sm" onClick={openEmployeeModal}>+ Add employee</Button></div><DataTable columns={columns} rows={employees} loading={loading} emptyTitle="No employees found" /></>}{!error && !['Departments', 'People'].includes(section) && <><Breadcrumbs items={[{ label: 'Workspace' }, { label: section }]} /><div className="page-heading"><div><div className="eyebrow">Monday, April 14, 2025</div><h1>Good morning, {firstName} <span className="wave">✦</span></h1><p>Here’s what’s happening across your workspace today.</p></div><Button type="button" size="sm" onClick={openEmployeeModal}>+ Add employee</Button></div><div className="kpi-grid"><div className="kpi-card"><div className="kpi-icon violet">♙</div><small>Total people</small><strong>{loading ? '—' : employees.length}</strong><span className="positive">From database</span></div></div></>}</main></div><Modal open={Boolean(modal)} title={modal === 'department' ? 'Add department' : 'Add employee'} description={modal === 'department' ? 'Create a new team space for your organization.' : 'Add a person to your workspace.'} onClose={() => setModal(null)}><form onSubmit={submit}><label>{modal === 'department' ? 'Department name' : 'Full name'}<input name="name" required autoFocus placeholder={modal === 'department' ? 'e.g. Product Design' : 'e.g. Jordan Alvarez'} /></label>{modal === 'employee' && <><label>Work email<input name="email" type="email" required placeholder="jordan@company.com" /></label><label>Password<input name="password" type="password" minLength="8" required placeholder="Temporary password" /></label><label>Job title<input name="role" placeholder="e.g. Product Designer" /></label></>}<Button type="submit" className="full">{modal === 'department' ? 'Add department' : 'Add employee'} →</Button></form></Modal><Toast message={message} onClose={() => setMessage('')} /></div>;
}
