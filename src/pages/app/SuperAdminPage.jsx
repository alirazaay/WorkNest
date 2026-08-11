import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import AppShell from '../../components/common/AppShell.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import Modal from '../../components/common/Modal.jsx';
import Button from '../../components/common/Button.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { cleanParams } from '../../utils/cleanParams.js';

export default function SuperAdminPage({ user, onExit }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ search: '', plan: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, tenantRes] = await Promise.all([
        api.get('/super/stats'),
        api.get('/super/tenants', { params: cleanParams({ ...filters, page, pageSize: 10 }) }),
      ]);
      setStats(statsRes.data.data);
      setTenants(tenantRes.data.data?.items || []);
      setPagination(tenantRes.data.data?.pagination || { page, totalPages: 1 });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load platform data.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(1); }, [load]);

  async function changeStatus(tenant, notify) {
    const action = tenant.isActive ? 'deactivate' : 'reactivate';
    try {
      await api.patch(`/super/tenants/${tenant.id}/${action}`);
      notify?.(`Tenant ${action}d successfully`);
      setSelected(null);
      await load(pagination.page);
    } catch (err) {
      setError(err.response?.data?.error?.message || `Could not ${action} tenant.`);
    }
  }

  async function viewTenant(tenant) {
    try {
      const res = await api.get(`/super/tenants/${tenant.id}`);
      setSelected(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load tenant details.');
    }
  }

  return (
    <AppShell user={user} active="Overview" onExit={onExit}>
      {({ notify }) => (
        <>
          <Breadcrumbs items={[{ label: 'Platform' }, { label: 'Super Admin' }]} />
          <div className="page-heading">
            <div>
              <div className="eyebrow">Platform administration</div>
              <h1>Super Admin</h1>
              <p>Manage WorkNest tenants and platform health.</p>
            </div>
          </div>
          {error && <ErrorState message={error} onRetry={() => load(pagination.page)} />}
          {loading && !error && <LoadingState label="Loading platform data…" />}
          {!loading && !error && (
            <>
              <div className="platform-stats">
                <Stat label="Total tenants" value={stats?.totalTenants} />
                <Stat label="Active tenants" value={stats?.activeTenants} tone="green" />
                <Stat label="Employees" value={stats?.totalEmployees} tone="blue" />
                <Stat label="Monthly revenue" value={`${stats?.currency || 'USD'} ${stats?.simulatedMonthlyRevenue || 0}`} tone="purple" />
              </div>
              <div className="tenant-toolbar">
                <input value={filters.search} onChange={(e) => setFilters((c) => ({ ...c, search: e.target.value }))} placeholder="Search companies or slugs" />
                <select value={filters.plan} onChange={(e) => setFilters((c) => ({ ...c, plan: e.target.value }))}>
                  <option value="">All plans</option>
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="enterprise">Enterprise</option>
                </select>
                <select value={filters.status} onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}>
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="tenant-table-wrap">
                <table className="data-table">
                  <thead><tr><th>Company</th><th>Plan</th><th>Employees</th><th>Departments</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {tenants.map((tenant) => (
                      <tr key={tenant.id}>
                        <td><button className="table-link" onClick={() => viewTenant(tenant)}>{tenant.companyName}</button><small>{tenant.slug}</small></td>
                        <td>{tenant.plan}</td>
                        <td>{tenant.employeeCount}</td>
                        <td>{tenant.departmentCount}</td>
                        <td><StatusBadge status={tenant.isActive ? 'active' : 'inactive'} /></td>
                        <td className="row-actions">
                          <button onClick={() => viewTenant(tenant)}>View</button>
                          <button onClick={() => changeStatus(tenant, notify)}>{tenant.isActive ? 'Deactivate' : 'Reactivate'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!tenants.length && <div className="table-empty">No tenants found.</div>}
              </div>
              <Pagination page={pagination.page || 1} totalPages={pagination.totalPages || 1} onChange={load} />
            </>
          )}
          <Modal open={Boolean(selected)} title={selected?.companyName || 'Tenant details'} description="Tenant overview and workspace configuration." onClose={() => setSelected(null)}>
            {selected && (
              <div className="tenant-detail">
                <div><strong>Slug</strong><span>{selected.slug}</span></div>
                <div><strong>Plan</strong><span>{selected.plan}</span></div>
                <div><strong>Employees</strong><span>{selected.employeeCount} / {selected.employeeLimit}</span></div>
                <div><strong>Departments</strong><span>{selected.departmentCount}</span></div>
                <div><strong>Timezone</strong><span>{selected.settings?.timezone || '—'}</span></div>
                <div><strong>Work hours</strong><span>{selected.settings?.workStartTime?.slice(0, 5)} – {selected.settings?.workEndTime?.slice(0, 5)}</span></div>
                <Button className="full" onClick={() => changeStatus(selected, notify)}>{selected.isActive ? 'Deactivate tenant' : 'Reactivate tenant'}</Button>
              </div>
            )}
          </Modal>
        </>
      )}
    </AppShell>
  );
}

function Stat({ label, value, tone = 'violet' }) {
  return <div className={`platform-stat ${tone}`}><span>{label}</span><strong>{value ?? '—'}</strong></div>;
}
