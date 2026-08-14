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
import { cleanParams } from '../../utils/cleanParams.js';

const isoToday = () => new Date().toISOString().slice(0, 10);

export default function LeavesPage({ user, onExit }) {
  const role = user?.user?.role || 'employee';
  const canReview = role === 'admin' || role === 'manager';
  const canFetchOwnBalance = role === 'employee' || Boolean(user?.user?.employeeId || user?.user?.employee?.id);

  const [requests, setRequests] = useState([]);
  const [types, setTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.allSettled([
        api.get('/leaves/requests', { params: cleanParams({ status, page, pageSize: 10 }) }),
        api.get('/leaves/types'),
        ...(canFetchOwnBalance ? [api.get('/leaves/balances/me')] : []),
      ]);
      const [listResult, typeResult, balanceResult] = results;
      if (listResult.status === 'rejected') throw listResult.reason;
      if (typeResult.status === 'rejected') throw typeResult.reason;
      const listRes = listResult.value;
      const typeRes = typeResult.value;
      setRequests(listRes.data.data?.items || []);
      setPagination(listRes.data.data?.pagination || { page, totalPages: 1 });
      setTypes(typeRes.data.data || []);
      if (canFetchOwnBalance && balanceResult?.status === 'fulfilled') setBalances(balanceResult.value.data.data || []);
      else if (!canFetchOwnBalance || balanceResult?.reason?.response?.data?.error?.code === 'EMPLOYEE_PROFILE_REQUIRED') setBalances([]);
      else if (balanceResult?.status === 'rejected') throw balanceResult.reason;
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load leave data.');
    } finally {
      setLoading(false);
    }
  }, [canFetchOwnBalance, status]);

  useEffect(() => { load(1); }, [load]);

  async function submitRequest(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.post('/leaves/requests', { leaveTypeId: Number(form.get('leaveTypeId')), fromDate: form.get('fromDate'), toDate: form.get('toDate'), reason: form.get('reason') || undefined });
      setModal(null);
      await load(1);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not submit leave request.');
    }
  }

  async function review(id, action, comment) {
    try {
      await api.patch(`/leaves/requests/${id}/${action}`, action === 'reject' ? { comment } : undefined);
      setModal(null);
      await load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.error?.message || `Could not ${action} leave request.`);
    }
  }

  async function cancel(id) {
    try {
      await api.patch(`/leaves/requests/${id}/cancel`);
      await load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not cancel leave request.');
    }
  }

  return (
    <AppShell user={user} active="Time off" onExit={onExit}>
      {({ notify }) => (
        <>
          <Breadcrumbs items={[{ label: 'Workspace' }, { label: 'Time off' }]} />
          <div className="page-heading">
            <div>
              <div className="eyebrow">Workspace</div>
              <h1>Time off</h1>
              <p>Manage leave balances and requests.</p>
            </div>
            <Button size="sm" onClick={() => setModal('create')}>+ Request time off</Button>
          </div>

          <div className="leave-balances">
            {balances.map((b) => (
              <div className="leave-balance" key={b.id || b.leaveTypeId}>
                <span>{b.leaveType?.name || b.name || 'Leave'}</span>
                <strong>{Math.max(0, Number(b.allocatedDays || 0) - Number(b.usedDays || 0) - Number(b.pendingDays || 0))}</strong>
                <small>days remaining</small>
              </div>
            ))}
          </div>

          {canReview && (
            <div className="leave-tabs">
              {[['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['cancelled', 'Cancelled']].map(([value, label]) => (
                <button key={label} className={status === value ? 'active' : ''} onClick={() => setStatus(value)}>{label}</button>
              ))}
            </div>
          )}

          {error && <ErrorState message={error} onRetry={() => load(pagination.page)} />}
          {loading && !error && <LoadingState label="Loading leave requests…" />}
          {!loading && !error && (
            <>
              <div className="leave-table-wrap">
                <table className="data-table">
                  <thead><tr>{canReview && <th>Employee</th>}<th>Leave type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {requests.map((req) => (
                      <tr key={req.id}>
                        {canReview && <td><strong>{req.employee?.user?.name || 'Employee'}</strong><small>{req.employee?.employeeCode || ''}</small></td>}
                        <td>{req.leaveType?.name || 'Leave'}</td>
                        <td>{req.fromDate} → {req.toDate}</td>
                        <td>{req.totalDays}</td>
                        <td className="reason-cell">{req.reason || '—'}</td>
                        <td><StatusBadge status={req.status} /></td>
                        <td className="row-actions">
                          {canReview && req.status === 'pending' && <><button onClick={() => { review(req.id, 'approve'); notify('Leave request approved'); }}>Approve</button><button onClick={() => setModal({ type: 'reject', request: req })}>Reject</button></>}
                          {!canReview && req.status === 'pending' && <button onClick={() => { cancel(req.id); notify('Leave request cancelled'); }}>Cancel</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!requests.length && <div className="table-empty">No leave requests found.</div>}
              </div>
              <Pagination page={pagination.page || 1} totalPages={pagination.totalPages || 1} onChange={load} />
            </>
          )}

          <Modal open={modal === 'create'} title="Request time off" description="Submit a leave request for manager approval." onClose={() => setModal(null)}>
            <form onSubmit={submitRequest}>
              <label>Leave type<select name="leaveTypeId" required><option value="">Select leave type</option>{types.filter((t) => t.isActive !== false).map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label>
              <div className="form-grid">
                <label>From<input name="fromDate" type="date" min={isoToday()} required /></label>
                <label>To<input name="toDate" type="date" min={isoToday()} required /></label>
              </div>
              <label>Reason<textarea name="reason" maxLength="2000" placeholder="Add context for your request" /></label>
              <Button type="submit" className="full">Submit request</Button>
            </form>
          </Modal>
          <Modal open={modal?.type === 'reject'} title="Reject leave request" description="Add an optional explanation for the employee." onClose={() => setModal(null)}>
            <form onSubmit={(e) => { e.preventDefault(); review(modal.request.id, 'reject', new FormData(e.currentTarget).get('comment')); notify('Leave request rejected'); }}>
              <label>Comment<textarea name="comment" maxLength="2000" placeholder="Reason for rejection" /></label>
              <Button type="submit" className="full">Reject request</Button>
            </form>
          </Modal>
        </>
      )}
    </AppShell>
  );
}
