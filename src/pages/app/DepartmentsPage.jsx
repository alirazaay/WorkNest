import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api.js';
import AppShell from '../../components/common/AppShell.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';

export default function DepartmentsPage({ user, onExit }) {
  const role = user?.user?.role || 'admin';

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [deptRes, empRes] = await Promise.all([api.get('/departments'), api.get('/employees')]);
      setDepartments(deptRes.data.data || []);
      setEmployees(empRes.data.data?.items || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Unable to load departments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit(event, notify) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = { name: data.get('name'), headEmployeeId: data.get('headEmployeeId') ? Number(data.get('headEmployeeId')) : null };
    try {
      const res = modal === 'edit'
        ? await api.patch(`/departments/${selected.id}`, payload)
        : await api.post('/departments', payload);
      setDepartments((curr) => modal === 'edit' ? curr.map((d) => d.id === selected.id ? res.data.data : d) : [...curr, res.data.data]);
      setModal(null);
      notify?.(modal === 'edit' ? 'Department updated successfully' : 'Department created successfully');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Unable to save department.');
    }
  }

  async function remove(notify) {
    try {
      await api.delete(`/departments/${selected.id}`);
      setDepartments((curr) => curr.filter((d) => d.id !== selected.id));
      setModal(null);
      notify?.('Department deleted successfully');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Unable to delete department. Active employees must be reassigned first.');
    }
  }

  return (
    <AppShell user={user} active="Departments" onExit={onExit}>
      {({ notify }) => (
        <>
          {error && <ErrorState message={error} onRetry={load} />}
          {!error && (
            <>
              <Breadcrumbs items={[{ label: 'Workspace' }, { label: 'Departments' }]} />
              <div className="page-heading">
                <div>
                  <div className="eyebrow">Workspace / Manage</div>
                  <h1>Departments</h1>
                  <p>Organize your people into focused teams and spaces.</p>
                </div>
                <Button type="button" size="sm" onClick={() => { setSelected(null); setModal('create'); }}>+ Add department</Button>
              </div>
              {loading ? (
                <div className="state-message loading-state">Loading departments…</div>
              ) : departments.length === 0 ? (
                <div className="state-message">
                  <h2>No departments yet</h2>
                  <p>Create your first department to organize your people.</p>
                  <Button type="button" onClick={() => setModal('create')}>+ Add department</Button>
                </div>
              ) : (
                <div className="department-grid">
                  {departments.map((dept) => {
                    const count = dept.employees?.length || 0;
                    return (
                      <div className="department-card" key={dept.id}>
                        <div className="dept-top">
                          <div className="department-icon">⌘</div>
                          <StatusBadge status="active">Active</StatusBadge>
                        </div>
                        <h2>{dept.name}</h2>
                        <p>{dept.head?.user?.name ? `Led by ${dept.head.user.name}` : 'No department head assigned.'}</p>
                        <div className="dept-meta">
                          <span><small>People</small><strong>{count}</strong></span>
                          <span><small>Department head</small><strong>{dept.head?.user?.name || 'Unassigned'}</strong></span>
                        </div>
                        <div className="department-actions">
                          <Button type="button" variant="secondary" size="sm" onClick={() => { setSelected(dept); setModal('edit'); }}>Edit</Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => { setSelected(dept); setModal('delete'); }}>Delete</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          <Modal open={modal === 'create' || modal === 'edit'} title={modal === 'edit' ? 'Edit department' : 'Add department'} description="Set the department name and assign an optional department head." onClose={() => setModal(null)}>
            <form onSubmit={(e) => submit(e, notify)}>
              <label>Department name<input name="name" required minLength="2" defaultValue={selected?.name || ''} placeholder="e.g. Product Design" /></label>
              <label>Department head
                <select name="headEmployeeId" defaultValue={selected?.headEmployeeId || ''}>
                  <option value="">Unassigned</option>
                  {employees.filter((e) => e.user?.role === 'manager' || e.user?.role === 'admin').map((e) => <option key={e.id} value={e.id}>{e.user?.name || e.employeeCode}</option>)}
                </select>
              </label>
              <Button type="submit" className="full">{modal === 'edit' ? 'Save changes' : 'Create department'}</Button>
            </form>
          </Modal>
          <Modal open={modal === 'delete'} title="Delete department" description={`Delete ${selected?.name || 'this department'}? Departments with active employees cannot be deleted.`} onClose={() => setModal(null)}>
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="button" onClick={() => remove(notify)}>Delete department</Button>
            </div>
          </Modal>
        </>
      )}
    </AppShell>
  );
}
