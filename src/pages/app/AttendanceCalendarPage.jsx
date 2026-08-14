import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import AppShell from '../../components/common/AppShell.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import Button from '../../components/common/Button.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';

const statuses = ['present', 'late', 'overtime', 'absent', 'leave', 'holiday', 'half-day', 'off'];
const labels = { present: 'Present', late: 'Late', overtime: 'Overtime', absent: 'Absent', leave: 'Leave', holiday: 'Holiday', 'half-day': 'Half Day', off: 'Day off' };
const monthStart = (value) => `${value}-01`;
const monthEnd = (value) => { const [year, month] = value.split('-').map(Number); return `${value}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')}`; };
const cellsForMonth = (month) => { const start = new Date(`${monthStart(month)}T00:00:00Z`); const startDay = start.getUTCDay(); const days = Number(monthEnd(month).slice(-2)); return Array.from({ length: Math.ceil((startDay + days) / 7) * 7 }, (_, index) => { const day = index - startDay + 1; return day > 0 && day <= days ? `${month}-${String(day).padStart(2, '0')}` : null; }); };

export default function AttendanceCalendarPage({ user, onExit }) {
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function load() { setLoading(true); setError(''); try { const response = await api.get('/attendance/calendar', { params: { fromDate: monthStart(month), toDate: monthEnd(month) } }); setItems(response.data.data?.items || []); setSummary(response.data.data?.summary || {}); } catch (err) { setError(err.response?.data?.error?.message || 'Could not load attendance calendar.'); } finally { setLoading(false); } }
  useEffect(() => { load(); }, [month]);
  const grouped = useMemo(() => items.reduce((map, item) => { (map[item.date] ||= []).push(item); return map; }, {}), [items]);
  const cells = useMemo(() => cellsForMonth(month), [month]);
  const previous = () => { const date = new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() - 1); setMonth(date.toISOString().slice(0, 7)); };
  const next = () => { const date = new Date(`${month}-01T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() + 1); setMonth(date.toISOString().slice(0, 7)); };
  return <AppShell user={user} active="Attendance" onExit={onExit}>
    <Breadcrumbs items={[{ label: 'Workspace' }, { label: 'Attendance' }, { label: 'Calendar' }]} />
    <div className="page-heading"><div><div className="eyebrow">Workspace</div><h1>Attendance calendar</h1><p>Review attendance states, leave, holidays, and overtime by day.</p></div><div className="attendance-actions"><Button variant="secondary" size="sm" onClick={() => navigate('/attendance')}>Table view</Button>{user?.user?.role === 'admin' && <Button variant="secondary" size="sm" onClick={() => navigate('/attendance/shifts')}>Manage shifts</Button>}</div></div>
    <div className="calendar-toolbar"><Button variant="secondary" size="sm" onClick={previous}>Previous</Button><strong>{new Date(`${month}-01T00:00:00Z`).toLocaleDateString([], { month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong><Button variant="secondary" size="sm" onClick={next}>Next</Button></div>
    {error && <ErrorState message={error} onRetry={load} />}
    {loading ? <LoadingState label="Loading attendance calendar…" /> : <><div className="calendar-legend">{statuses.map((status) => <span key={status}><i className={`calendar-dot ${status}`} />{labels[status]}</span>)}</div><div className="attendance-calendar"><div className="calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <strong key={day}>{day}</strong>)}</div>{cells.map((date, index) => { const dayItems = date ? grouped[date] || [] : []; const counts = dayItems.reduce((result, item) => { result[item.status] = (result[item.status] || 0) + 1; return result; }, {}); const state = statuses.find((status) => counts[status]) || 'off'; return <div className={`calendar-day ${date ? '' : 'blank'}`} key={`${date || 'blank'}-${index}`}>{date && <><b>{Number(date.slice(-2))}</b>{dayItems.length ? <><span className={`calendar-state ${state}`}>{labels[state]}</span>{dayItems.length > 1 && <small>{dayItems.length} employees · {Object.entries(counts).map(([key, value]) => `${value} ${labels[key]}`).join(', ')}</small>}{dayItems.length === 1 && dayItems[0].attendance && <small>{dayItems[0].attendance.lateMinutes} late · {dayItems[0].attendance.overtimeMinutes} overtime min</small>}</> : <span className="calendar-state off">No record</span>}</>}</div>; })}</div><div className="calendar-summary">{Object.entries(summary).filter(([status]) => labels[status]).map(([status, count]) => <div key={status}><small>{labels[status]}</small><strong>{count}</strong></div>)}</div></>}
  </AppShell>;
}
