import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api.js';
import AppShell from '../../components/common/AppShell.jsx';
import Modal from '../../components/common/Modal.jsx';
import Button from '../../components/common/Button.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import { cleanParams } from '../../utils/cleanParams.js';

export default function EmployeesPage({ user, onExit }) {
  const role = user?.user?.role || 'admin';
  const canManage = role === 'admin';

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', status: '', departmentId: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);

  // useCallback so the function reference is stable across renders — avoids useEffect loops.
  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const [empRes, deptRes] = await Promise.all([
        api.get('/employees', { params: cleanParams({ ...filters, page, pageSize: 10 }) }),
        api.get('/departments'),
      ]);
      setEmployees(empRes.data.data?.items || []);
      setPagination(empRes.data.data?.pagination || { page, totalPages: 1 });
      setDepartments(deptRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load employees.');
    } finally {
      setLoading(false);
    }
  }, [filters]); // filters is the actual dep — recreate load when filters change

  useEffect(() => { load(1); }, [load]); // stable: only runs when load ref changes (i.e. filters changed)

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    const payload = { ...values, departmentId: values.departmentId ? Number(values.departmentId) : null, role: values.role || 'employee', employmentType: values.employmentType || 'full-time' };
    const salaryFields = ['baseSalary', 'houseAllowance', 'transportAllowance', 'medicalAllowance', 'taxDeduction', 'otherDeductions'];
    if (values.baseSalary) payload.salary = { effectiveFrom: values.salaryEffectiveFrom || new Date().toISOString().slice(0, 10), ...Object.fromEntries(salaryFields.filter((f) => values[f] !== '').map((f) => [f, Number(values[f])])) };
    ['baseSalary', 'salaryEffectiveFrom', 'houseAllowance', 'transportAllowance', 'medicalAllowance', 'taxDeduction', 'otherDeductions'].forEach((k) => delete payload[k]);
    if (modal.type === 'edit') delete payload.password;
    try {
      modal.type === 'create' ? await api.post('/employees', payload) : await api.patch(`/employees/${modal.employee.id}`, payload);
      setModal(null);
      await load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save employee.');
    }
  }

  async function changeStatus(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.patch(`/employees/${modal.employee.id}/status`, { status: form.get('status'), reason: form.get('reason') || undefined });
      setModal(null);
      await load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not update status.');
    }
  }

  return (
    <AppShell user={user} active="People" onExit={onExit}>
      {({ notify }) => (
        <>
          <Breadcrumbs items={[{ label: 'Workspace' }, { label: 'People' }]} />
          <div className="page-heading">
            <div>
              <div className="eyebrow">Workspace</div>
              <h1>People</h1>
              <p>Search, filter, and manage your employee directory.</p>
            </div>
            {canManage && <Button type="button" size="sm" onClick={() => setModal({ type: 'create' })}>+ Add employee</Button>}
          </div>

          <div className="employee-filters">
            <input value={filters.search} onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))} placeholder="Search name or employee ID" />
            <select value={filters.departmentId} onChange={(e) => setFilters((c) => ({ ...c, departmentId: e.target.value }))}>
              <option value="">All departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={filters.status} onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="on-leave">On leave</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>

          {error && <ErrorState message={error} onRetry={() => load(pagination.page)} />}
          {loading && !error && <LoadingState label="Loading employees…" />}
          {!loading && !error && (
            <>
              <div className="employee-table-wrap">
                <table className="data-table">
                  <thead><tr><th>Employee</th><th>Employee ID</th><th>Department</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id}>
                        <td><button className="table-link" onClick={() => setModal({ type: 'view', employee: emp })}>{emp.user?.name || emp.name}</button><small>{emp.user?.email || emp.email}</small></td>
                        <td>{emp.employeeCode}</td>
                        <td>{emp.department?.name || 'Unassigned'}</td>
                        <td>{emp.designation || emp.user?.role || 'Employee'}</td>
                        <td><StatusBadge status={emp.employmentStatus} /></td>
                        <td className="row-actions">
                          <button onClick={() => setModal({ type: 'view', employee: emp })}>View</button>
                          {canManage && <><button onClick={() => setModal({ type: 'edit', employee: emp })}>Edit</button><button onClick={() => setModal({ type: 'status', employee: emp })}>Status</button></>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!employees.length && <div className="table-empty">No employees match the selected filters.</div>}
              </div>
              <Pagination page={pagination.page || 1} totalPages={pagination.totalPages || 1} onChange={load} />
            </>
          )}

          <Modal open={modal?.type === 'create' || modal?.type === 'edit'} title={modal?.type === 'edit' ? 'Edit employee' : 'Add employee'} description="Keep employee information and employment details up to date." onClose={() => setModal(null)}>
            <EmployeeForm employee={modal?.employee} departments={departments} onSubmit={submit} edit={modal?.type === 'edit'} />
          </Modal>
          <Modal open={modal?.type === 'status'} title="Change employment status" description="Status changes affect access and future HR workflows." onClose={() => setModal(null)}>
            <form onSubmit={changeStatus}>
              <label>Status<select name="status" defaultValue={modal?.employee?.employmentStatus || 'active'}><option value="active">Active</option><option value="on-leave">On leave</option><option value="terminated">Terminated</option></select></label>
              <label>Reason<textarea name="reason" placeholder="Optional reason" /></label>
              <Button type="submit" className="full">Update status</Button>
            </form>
          </Modal>
          <Modal open={modal?.type === 'view'} title={modal?.employee?.user?.name || 'Employee profile'} description="Employee profile and employment information." onClose={() => setModal(null)}>
            <EmployeeProfile employee={modal?.employee} notify={notify} />
          </Modal>
        </>
      )}
    </AppShell>
  );
}

function EmployeeForm({ employee, departments, onSubmit, edit }) {
  const salary = employee?.salaryStructures?.[0] || {};
  return (
    <form onSubmit={onSubmit}>
      <label>Full name<input name="name" required defaultValue={employee?.user?.name || ''} /></label>
      <label>Work email<input name="email" type="email" disabled={edit} required defaultValue={employee?.user?.email || ''} /></label>
      {!edit && <label>Temporary password<input name="password" type="password" minLength="8" required /></label>}
      <label>Role<select name="role" defaultValue={employee?.user?.role || 'employee'}><option value="employee">Employee</option><option value="manager">Manager</option></select></label>
      <label>Department<select name="departmentId" defaultValue={employee?.departmentId || ''}><option value="">Unassigned</option>{departments.map((d) => <option value={d.id} key={d.id}>{d.name}</option>)}</select></label>
      <label>Job title<input name="designation" defaultValue={employee?.designation || ''} /></label>
      <label>Employment type<select name="employmentType" defaultValue={employee?.employmentType || 'full-time'}><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option></select></label>
      <div className="form-section-title">Compensation</div>
      <div className="form-grid">
        <label>Base salary<input name="baseSalary" type="number" min="0" step="0.01" defaultValue={salary.baseSalary || ''} /></label>
        <label>Effective from<input name="salaryEffectiveFrom" type="date" defaultValue={salary.effectiveFrom || ''} /></label>
      </div>
      <div className="form-grid">
        <label>House allowance<input name="houseAllowance" type="number" min="0" step="0.01" defaultValue={salary.houseAllowance || ''} /></label>
        <label>Transport allowance<input name="transportAllowance" type="number" min="0" step="0.01" defaultValue={salary.transportAllowance || ''} /></label>
      </div>
      <Button type="submit" className="full">{edit ? 'Save changes' : 'Add employee'}</Button>
    </form>
  );
}

function EmployeeProfile({ employee, notify }) {
  const [documents, setDocuments] = useState([]);
  const [documentType, setDocumentType] = useState('other');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [documentError, setDocumentError] = useState('');

  useEffect(() => {
    // AbortController prevents stale state updates if the modal closes before the request finishes.
    const controller = new AbortController();
    api.get(`/employees/${employee.id}/documents`, { signal: controller.signal })
      .then((res) => setDocuments(res.data.data || []))
      .catch((err) => { if (!controller.signal.aborted) setDocumentError('Documents could not be loaded.'); });
    return () => controller.abort();
  }, [employee.id]);

  async function upload(event) {
    event.preventDefault();
    if (!file) return;
    setUploading(true);
    setDocumentError('');
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('documentType', documentType);
      const res = await api.post(`/employees/${employee.id}/documents`, body);
      setDocuments((current) => [res.data.data, ...current]);
      setFile(null);
      event.currentTarget.reset();
      notify?.('Document uploaded successfully');
    } catch (err) {
      setDocumentError(err.response?.data?.error?.message || 'Document upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="employee-profile">
      <div className="profile-detail"><strong>Employee ID</strong><span>{employee?.employeeCode}</span></div>
      <div className="profile-detail"><strong>Email</strong><span>{employee?.user?.email}</span></div>
      <div className="profile-detail"><strong>Department</strong><span>{employee?.department?.name || 'Unassigned'}</span></div>
      <div className="profile-detail"><strong>Job title</strong><span>{employee?.designation || 'Not specified'}</span></div>
      <div className="profile-detail"><strong>Status</strong><StatusBadge status={employee?.employmentStatus} /></div>
      {employee?.salaryStructures?.length > 0 && (
        <div className="salary-history">
          <h3>Salary history</h3>
          {employee.salaryStructures.map((s) => <div key={s.id}><span>{s.effectiveFrom}</span><strong>{s.baseSalary}</strong></div>)}
        </div>
      )}
      <div className="document-section">
        <h3>Documents</h3>
        {documentError && <p className="form-error">{documentError}</p>}
        <form onSubmit={upload} className="document-upload">
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
            <option value="other">Other</option>
            <option value="contract">Contract</option>
            <option value="cnic">CNIC</option>
            <option value="resume">Resume</option>
          </select>
          <input type="file" required onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button type="submit" loading={uploading}>Upload</Button>
        </form>
        {documents.length ? (
          <ul className="document-list">
            {documents.map((d) => <li key={d.id}><span>{d.fileName || d.originalName || d.name}</span><small>{d.documentType}</small></li>)}
          </ul>
        ) : <p className="muted-text">No documents uploaded.</p>}
      </div>
    </div>
  );
}
