import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import AppShell from '../../components/common/AppShell.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import Button from '../../components/common/Button.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { cleanParams } from '../../utils/cleanParams.js';

const today = () => new Date().toISOString().slice(0, 10);
const month = () => new Date().toISOString().slice(0, 7);
const displayTime = (v) => v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
const displayDate = (v) => v ? new Date(`${v}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function AttendancePage({ user, onExit }) {
  const navigate = useNavigate();
  const role = user?.user?.role || 'employee';
  const isEmployee = role === 'employee';

  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [summary, setSummary] = useState(null);
  const [locations, setLocations] = useState([]);
  const [filters, setFilters] = useState({ fromDate: `${month()}-01`, toDate: today(), status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fixed: parallelised the two API calls (records + summary) and wrapped in useCallback.
  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const query = cleanParams({ ...filters, page, pageSize: 25 });
      // Run both requests in parallel instead of sequentially.
      const requests = [api.get(isEmployee ? '/attendance/me' : '/attendance', { params: query })];
      if (!isEmployee) requests.push(api.get('/attendance/summary', { params: cleanParams({ month: filters.fromDate.slice(0, 7) }) }));

      const [recordsRes, summaryRes] = await Promise.all(requests);
      const data = recordsRes.data.data || {};
      setRecords(data.items || []);
      setPagination(data.pagination || { page, totalPages: 1 });
      if (!isEmployee && summaryRes) setSummary(summaryRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load attendance.');
    } finally {
      setLoading(false);
    }
  }, [filters, isEmployee]);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => { if (isEmployee) api.get('/attendance/locations').then((response) => setLocations(response.data.data || [])).catch(() => setLocations([])); }, [isEmployee]);

  const todayRecord = useMemo(() => records.find((r) => String(r.attendanceDate).slice(0, 10) === today()), [records]);

  async function clockIn() {
    setActionLoading(true);
    try { await api.post('/attendance/clock-in'); await load(1); }
    catch (err) { setError(err.response?.data?.error?.message || 'Could not clock in.'); }
    finally { setActionLoading(false); }
  }

  async function clockOut() {
    setActionLoading(true);
    try { await api.patch(`/attendance/${todayRecord.id}/clock-out`); await load(1); }
    catch (err) { setError(err.response?.data?.error?.message || 'Could not clock out.'); }
    finally { setActionLoading(false); }
  }

  function clockInGps() {
    if (!locations.length) { setError('No active GPS attendance location is configured.'); return; }
    if (!navigator.geolocation) { setError('This browser does not support GPS attendance.'); return; }
    setActionLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try { await api.post('/attendance/clock-in/gps', { locationId: locations[0].id, latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, deviceMetadata: { userAgent: window.navigator.userAgent.slice(0, 180) } }); await load(1); }
      catch (err) { setError(err.response?.data?.error?.message || 'Could not clock in with GPS.'); }
      finally { setActionLoading(false); }
    }, () => { setActionLoading(false); setError('Location permission is required for GPS attendance.'); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  }

  return (
    <AppShell user={user} active="Attendance" onExit={onExit}>
      {({ notify }) => (
        <>
          <Breadcrumbs items={[{ label: 'Workspace' }, { label: 'Attendance' }]} />
          <div className="page-heading">
            <div>
              <div className="eyebrow">Workspace</div>
              <h1>Attendance</h1>
              <p>Track daily attendance and working hours.</p>
            </div>
            <div className="attendance-actions">
              <Button variant="secondary" size="sm" onClick={() => navigate('/attendance/calendar')}>Calendar</Button>
              {!isEmployee && <Button variant="secondary" size="sm" onClick={() => navigate('/attendance/shifts')}>Manage shifts</Button>}
              {isEmployee && (
                <>
                  {!todayRecord?.clockIn && <Button size="sm" loading={actionLoading} onClick={clockIn}>Clock in</Button>}
                  {!todayRecord?.clockIn && locations.length > 0 && <Button variant="secondary" size="sm" loading={actionLoading} onClick={clockInGps}>GPS clock in</Button>}
                  {todayRecord?.clockIn && !todayRecord?.clockOut && <Button size="sm" loading={actionLoading} onClick={clockOut}>Clock out</Button>}
                </>
              )}
            </div>
          </div>

          {!isEmployee && summary && (
            <div className="attendance-summary">
              <div className="kpi-card"><small>Present today</small><strong>{summary.presentToday ?? '—'}</strong></div>
              <div className="kpi-card"><small>On leave</small><strong>{summary.onLeaveToday ?? '—'}</strong></div>
              <div className="kpi-card"><small>Attendance rate</small><strong>{summary.attendanceRate ? `${summary.attendanceRate}%` : '—'}</strong></div>
            </div>
          )}

          <div className="attendance-filters">
            <input type="date" value={filters.fromDate} onChange={(e) => setFilters((c) => ({ ...c, fromDate: e.target.value }))} />
            <input type="date" value={filters.toDate} onChange={(e) => setFilters((c) => ({ ...c, toDate: e.target.value }))} />
            <select value={filters.status} onChange={(e) => setFilters((c) => ({ ...c, status: e.target.value }))}>
              <option value="">All statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          {error && <ErrorState message={error} onRetry={() => load(pagination.page)} />}
          {loading && !error && <LoadingState label="Loading attendance…" />}
          {!loading && !error && (
            <>
              <div className="attendance-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      {!isEmployee && <th>Employee</th>}
                      <th>Date</th>
                      <th>Check in</th>
                      <th>Check out</th>
                      <th>Worked</th>
                      <th>Late</th>
                      <th>Overtime</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id}>
                        {!isEmployee && <td><strong>{record.employee?.user?.name || 'Employee'}</strong><small>{record.employee?.employeeCode || ''}</small></td>}
                        <td>{displayDate(record.attendanceDate)}</td>
                        <td>{displayTime(record.clockIn)}</td>
                        <td>{displayTime(record.clockOut)}</td>
                        <td>{record.workedMinutes ?? record.totalMinutes ?? '—'} min</td>
                        <td>{record.lateMinutes || 0} min</td>
                        <td>{record.overtimeMinutes || 0} min</td>
                        <td><StatusBadge status={record.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!records.length && <div className="table-empty">No attendance records found for this period.</div>}
              </div>
              <Pagination page={pagination.page || 1} totalPages={pagination.totalPages || 1} onChange={load} />
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
