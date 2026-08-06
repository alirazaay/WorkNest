import React, { useEffect, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, ChevronDown, LogOut, Plus, Sparkles, Users, X } from 'lucide-react';
import { login as loginUser } from './services/authService.js';
import api from './services/api.js';

function Logo() {
  return <div className="logo"><span className="logo-mark"><Sparkles size={17} /></span><span>WorkNest</span></div>;
}

export function Login({ onSuccess, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session = await loginUser({ email, password });
      onSuccess(session);
    } catch (err) {
      setError(err.response?.data?.error?.message || (err.request ? 'Unable to reach the backend. Start the backend server and try again.' : 'Unable to sign in. Check your email and password.'));
    } finally {
      setBusy(false);
    }
  }

  return <div className="auth-screen"><div className="auth-card"><button className="auth-back" onClick={onBack}>← Back to home</button><Logo /><h1>Welcome back</h1><p>Sign in to continue to your WorkNest workspace.</p><form onSubmit={submit}><label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="you@company.com" /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Enter your password" /></label>{error && <div className="auth-error" role="alert">{error}</div>}<button className="primary-button full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} /></button></form></div></div>;
}

export function Workspace({ user, onExit }) {
  const [section, setSection] = useState('Overview');
  const [modal, setModal] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([api.get('/departments'), api.get('/employees')])
      .then(([departmentResponse, employeeResponse]) => {
        setDepartments(departmentResponse.data.data || []);
        setEmployees(employeeResponse.data.data?.items || []);
      })
      .catch(() => setLoadError('Could not load workspace records. Please confirm the backend and database are running.'));
  }, []);

  function closeWithMessage(text) { setModal(null); setMessage(text); window.setTimeout(() => setMessage(''), 2200); }
  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      if (modal === 'department') {
        const response = await api.post('/departments', { name: data.get('name') });
        setDepartments([...departments, response.data.data]);
        closeWithMessage('Department added successfully');
      } else {
        const response = await api.post('/employees', { name: data.get('name'), email: data.get('email'), password: data.get('password'), designation: data.get('role') || undefined, employmentType: 'full-time' });
        setEmployees([...employees, response.data.data]);
        closeWithMessage('Employee added successfully');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not save this record.');
      window.setTimeout(() => setMessage(''), 3000);
    }
  }
  const firstName = user?.user?.firstName || 'Amara';
  return <div className="app"><aside className="app-sidebar"><div className="sidebar-brand"><Logo /><span className="workspace">Acme Inc. <ChevronDown size={14} /></span></div><div className="sidebar-label">Workspace</div>{['Overview', 'People', 'Time off', 'Payroll', 'Reports'].map(item => <button key={item} className={section === item ? 'side-link active' : 'side-link'} onClick={() => setSection(item)}><Users size={17} />{item}</button>)}<div className="sidebar-label settings-label">Manage</div><button className={section === 'Departments' ? 'side-link active' : 'side-link'} onClick={() => setSection('Departments')}><BriefcaseBusiness size={17} />Departments</button><div className="sidebar-bottom"><button className="side-link" onClick={onExit}><LogOut size={17} />Sign out</button></div></aside><div className="app-content"><header className="app-header"><div className="logo">{firstName ? `Good to see you, ${firstName}` : 'WorkNest'}</div></header><main className="dashboard-main">{loadError && <div className="auth-error" role="alert">{loadError}</div>}{section === 'Departments' ? <><div className="page-heading"><div><div className="eyebrow">Workspace / Manage</div><h1>Departments</h1><p>Shape the teams and spaces that make your organization work.</p></div><button className="primary-button small" onClick={() => setModal('department')}><Plus size={16} /> Add department</button></div><div className="department-grid">{departments.map(department => <div className="department-card" key={department.id}><div className="department-icon"><BriefcaseBusiness size={19} /></div><h2>{department.name}</h2><p>Team space for your organization.</p></div>)}</div></> : <><div className="page-heading"><div><div className="eyebrow">Monday, April 14, 2025</div><h1>Good morning, {firstName} <span className="wave">✦</span></h1><p>Here’s what’s happening across your workspace today.</p></div><button className="primary-button small" onClick={() => setModal('employee')}><Plus size={16} /> Add employee</button></div><div className="kpi-grid"><div className="kpi-card"><div className="kpi-icon violet"><Users size={18} /></div><small>Total people</small><strong>{employees.length}</strong><span className="positive">From database</span></div></div></>}</main></div>{modal && <div className="modal-backdrop"><form className="modal" onSubmit={submit}><button type="button" className="modal-close" onClick={() => setModal(null)}><X size={18} /></button><div className="feature-icon"><Plus size={19} /></div><h2>{modal === 'department' ? 'Add department' : 'Add employee'}</h2><p>{modal === 'department' ? 'Create a new team space for your organization.' : 'Add a person to your workspace.'}</p><label>{modal === 'department' ? 'Department name' : 'Full name'}<input name="name" required autoFocus placeholder={modal === 'department' ? 'e.g. Product Design' : 'e.g. Jordan Alvarez'} /></label>{modal === 'employee' && <><label>Work email<input name="email" type="email" required placeholder="jordan@company.com" /></label><label>Password<input name="password" type="password" minLength="8" required placeholder="Temporary password" /></label><label>Job title<input name="role" placeholder="e.g. Product Designer" /></label></>}<button className="primary-button full">{modal === 'department' ? 'Add department' : 'Add employee'} <ArrowRight size={16} /></button></form></div>}{message && <div className="toast">{message}</div>}</div>;
}
