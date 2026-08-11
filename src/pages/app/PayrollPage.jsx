import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api.js';
import AppShell from '../../components/common/AppShell.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import Button from '../../components/common/Button.jsx';
import Modal from '../../components/common/Modal.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import PayrollSetupPanel from '../../components/payroll/PayrollSetupPanel.jsx';
import { cleanParams } from '../../utils/cleanParams.js';

const money = (v) => `PKR ${Number(v || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
const currentPeriod = () => { const d = new Date(); return { month: d.getMonth() + 1, year: d.getFullYear() }; };

export default function PayrollPage({ user, onExit }) {
  const role = user?.user?.role || 'employee';
  const isAdmin = role === 'admin';
  const initial = currentPeriod();

  const [runs, setRuns] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ month: initial.month, year: initial.year, status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      if (isAdmin) {
        const res = await api.get('/payroll', { params: cleanParams({ ...filters, page, pageSize: 10 }) });
        setRuns(res.data.data?.items || []);
        setPagination(res.data.data?.pagination || { page, totalPages: 1 });
      } else {
        const res = await api.get('/payroll/me');
        setPayslips(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load payroll.');
    } finally {
      setLoading(false);
    }
  }, [filters, isAdmin]);

  useEffect(() => { load(1); }, [load]);

  async function generate(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setActionLoading(true);
    try {
      await api.post('/payroll/generate', { month: Number(form.get('month')), year: Number(form.get('year')) });
      setModal(null);
      await load(1);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not generate payroll.');
    } finally {
      setActionLoading(false);
    }
  }

  async function changeRun(id, action, notify) {
    setActionLoading(true);
    try {
      await api.post(`/payroll/runs/${id}/${action}`);
      notify?.(`Payroll ${action}d successfully`);
      await load(pagination.page);
      if (modal?.run?.id === id) setModal(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || `Could not ${action} payroll.`);
    } finally {
      setActionLoading(false);
    }
  }

  // Fixed: always revoke object URL in finally to prevent memory leaks.
  async function download(url, filename) {
    let objectUrl = null;
    try {
      const res = await api.get(url, { responseType: 'blob' });
      objectUrl = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.click();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not download file.');
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  return (
    <AppShell user={user} active="Payroll" onExit={onExit}>
      {({ notify }) => (
        <>
          <Breadcrumbs items={[{ label: 'Workspace' }, { label: 'Payroll' }]} />
          <div className="page-heading">
            <div>
              <div className="eyebrow">Workspace</div>
              <h1>{isAdmin ? 'Payroll' : 'My payslips'}</h1>
              <p>{isAdmin ? 'Generate, review, approve, lock, and export monthly payroll.' : 'Access your payroll history and payslips.'}</p>
            </div>
            {isAdmin && <Button size="sm" onClick={() => setModal('generate')}>+ Generate payroll</Button>}
          </div>

          {error && <ErrorState message={error} onRetry={() => load(pagination.page)} />}
          {loading && !error && <LoadingState label="Loading payroll…" />}

          {!loading && !error && isAdmin && (
            <>
              <PayrollSetupPanel onError={setError} onMessage={notify} />
              <div className="payroll-toolbar">
                <label>Month
                  <select value={filters.month} onChange={(e) => setFilters((c) => ({ ...c, month: e.target.value }))}>
                    {Array.from({ length: 12 }, (_, i) => <option value={i + 1} key={i}>{new Date(2020, i).toLocaleString([], { month: 'long' })}</option>)}
                  </select>
                </label>
                <label>Year<input type="number" value={filters.year} onChange={(e) => setFilters((c) => ({ ...c, year: e.target.value }))} /></label>
                <label>Status
                  <select value={filters.status} onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}>
                    <option value="">All statuses</option>
                    <option value="generated">Generated</option>
                    <option value="under_review">Under review</option>
                    <option value="approved">Approved</option>
                    <option value="locked">Locked</option>
                  </select>
                </label>
              </div>
              <div className="payroll-table-wrap">
                <table className="data-table">
                  <thead><tr><th>Period</th><th>Gross</th><th>Deductions</th><th>Net payroll</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.id}>
                        <td><button className="table-link" onClick={() => setModal({ type: 'run', run })}>{run.month}/{run.year}</button></td>
                        <td>{money(run.totalGross)}</td>
                        <td>{money(run.totalDeductions)}</td>
                        <td><strong>{money(run.totalNet)}</strong></td>
                        <td><StatusBadge status={run.status} /></td>
                        <td className="row-actions">
                          <button onClick={() => setModal({ type: 'run', run })}>View</button>
                          {run.status === 'generated' && <button onClick={() => changeRun(run.id, 'approve', notify)}>Approve</button>}
                          {run.status === 'approved' && <button onClick={() => changeRun(run.id, 'lock', notify)}>Lock</button>}
                          <button onClick={() => download(`/payroll/export/csv?runId=${run.id}`, `worknest-payroll-${run.id}.csv`)}>CSV</button>
                          {['approved', 'locked'].includes(run.status) && <button onClick={() => download(`/payroll/runs/${run.id}/export/bank`, `worknest-bank-${run.id}.csv`)}>Bank CSV</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!runs.length && <div className="table-empty">No payroll runs found for this period.</div>}
              </div>
              <Pagination page={pagination.page || 1} totalPages={pagination.totalPages || 1} onChange={load} />
            </>
          )}

          {!loading && !error && !isAdmin && (
            <div className="payslip-grid">
              {payslips.map((item) => (
                <div className="payslip-card" key={item.id}>
                  <div className="panel-heading">
                    <div><h2>{item.run?.month}/{item.run?.year}</h2><p>{item.employee?.employeeCode || 'Payslip'}</p></div>
                    <StatusBadge status={item.status || item.run?.status} />
                  </div>
                  <div className="payslip-total"><span>Net salary</span><strong>{money(item.netSalary)}</strong></div>
                  <div className="payslip-meta"><span>Gross {money(item.grossSalary)}</span><span>Deductions {money(item.totalDeductions)}</span></div>
                  <Button variant="secondary" size="sm" onClick={() => download(`/payroll/items/${item.id}/pdf`, `worknest-payslip-${item.id}.pdf`)}>Download PDF</Button>
                </div>
              ))}
              {!payslips.length && <div className="table-empty">No payslips are available yet.</div>}
            </div>
          )}

          <Modal open={modal === 'generate'} title="Generate payroll" description="Payroll is calculated for all active employees in the selected period." onClose={() => setModal(null)}>
            <form onSubmit={generate}>
              <div className="form-grid">
                <label>Month<select name="month" defaultValue={initial.month}>{Array.from({ length: 12 }, (_, i) => <option value={i + 1} key={i}>{new Date(2020, i).toLocaleString([], { month: 'long' })}</option>)}</select></label>
                <label>Year<input name="year" type="number" min="2000" max="2200" defaultValue={initial.year} required /></label>
              </div>
              <Button type="submit" loading={actionLoading} className="full">Generate payroll</Button>
            </form>
          </Modal>
          <Modal open={modal?.type === 'run'} title={`Payroll ${modal?.run?.month}/${modal?.run?.year}`} description="Payroll items and payslip access for this run." onClose={() => setModal(null)}>
            <div className="payroll-run-detail">
              {modal?.run?.items?.map((item) => (
                <div className="payroll-item" key={item.id}>
                  <span>{item.employee?.user?.name || item.employee?.employeeCode}</span>
                  <strong>{money(item.netSalary)}</strong>
                  <button onClick={() => download(`/payroll/items/${item.id}/pdf`, `worknest-payslip-${item.id}.pdf`)}>PDF</button>
                </div>
              ))}
              {!modal?.run?.items?.length && <p className="muted-text">Open a generated run to view its payroll items.</p>}
            </div>
          </Modal>
        </>
      )}
    </AppShell>
  );
}
