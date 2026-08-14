import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import AppShell from '../../components/common/AppShell.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import Button from '../../components/common/Button.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AttendanceShiftsPage({ user, onExit }) {
  const navigate = useNavigate();
  const [shifts, setShifts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ name: '', startTime: '09:00', endTime: '17:00', graceMinutes: 15, breakMinutes: 60, overtimeAfterMinutes: 480, isOvernight: false });
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [locationForm, setLocationForm] = useState({ name: '', latitude: '', longitude: '', radiusMeters: 150 });

  async function load() {
    setLoading(true); setError('');
    try { const [shiftResponse, locationResponse] = await Promise.all([api.get('/attendance/shifts'), api.get('/attendance/locations')]); setShifts(shiftResponse.data.data || []); setLocations(locationResponse.data.data || []); }
    catch (err) { setError(err.response?.data?.error?.message || 'Could not load shifts.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function create(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const response = await api.post('/attendance/shifts', { ...form, graceMinutes: Number(form.graceMinutes), breakMinutes: Number(form.breakMinutes), overtimeAfterMinutes: Number(form.overtimeAfterMinutes) });
      const shift = response.data.data;
      await api.put(`/attendance/shifts/${shift.id}/schedule`, { days: weekdays.map((_, weekday) => ({ weekday, isWorkingDay: days.includes(weekday) })) });
      setForm({ name: '', startTime: '09:00', endTime: '17:00', graceMinutes: 15, breakMinutes: 60, overtimeAfterMinutes: 480, isOvernight: false });
      await load();
    } catch (err) { setError(err.response?.data?.error?.message || 'Could not create shift.'); }
    finally { setSaving(false); }
  }

  async function createLocation(event) {
    event.preventDefault(); setSaving(true); setError('');
    try { await api.post('/attendance/locations', { ...locationForm, latitude: Number(locationForm.latitude), longitude: Number(locationForm.longitude), radiusMeters: Number(locationForm.radiusMeters) }); setLocationForm({ name: '', latitude: '', longitude: '', radiusMeters: 150 }); await load(); }
    catch (err) { setError(err.response?.data?.error?.message || 'Could not create attendance location.'); }
    finally { setSaving(false); }
  }

  return <AppShell user={user} active="Attendance" onExit={onExit}>
    <Breadcrumbs items={[{ label: 'Workspace' }, { label: 'Attendance' }, { label: 'Shifts' }]} />
    <div className="page-heading"><div><div className="eyebrow">Administration</div><h1>Shift management</h1><p>Define work hours, grace periods, breaks, and weekly schedules.</p></div><Button variant="secondary" onClick={() => navigate('/attendance')}>Back to attendance</Button></div>
    {error && <ErrorState message={error} onRetry={load} />}
    <div className="settings-grid">
      <section className="settings-card"><h2>Create shift</h2><p>Assignments and late/overtime calculations will use these settings.</p><form onSubmit={create}>
        <label>Shift name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Standard day" /></label>
        <div className="form-grid"><label>Starts<input type="time" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></label><label>Ends<input type="time" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></label></div>
        <div className="form-grid"><label>Grace minutes<input type="number" min="0" value={form.graceMinutes} onChange={(e) => setForm({ ...form, graceMinutes: e.target.value })} /></label><label>Break minutes<input type="number" min="0" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: e.target.value })} /></label></div>
        <label>Overtime after minutes<input type="number" min="0" value={form.overtimeAfterMinutes} onChange={(e) => setForm({ ...form, overtimeAfterMinutes: e.target.value })} /></label>
        <label className="checkbox-field"><input type="checkbox" checked={form.isOvernight} onChange={(e) => setForm({ ...form, isOvernight: e.target.checked })} /> Overnight shift</label>
        <div className="shift-weekdays"><span>Working days</span>{weekdays.map((day, weekday) => <label key={day}><input type="checkbox" checked={days.includes(weekday)} onChange={() => setDays((current) => current.includes(weekday) ? current.filter((value) => value !== weekday) : [...current, weekday])} /> {day.slice(0, 3)}</label>)}</div>
        <Button type="submit" loading={saving}>Create shift</Button>
      </form></section>
      <section className="settings-card"><h2>Existing shifts</h2><p>{shifts.length ? `${shifts.length} shift${shifts.length === 1 ? '' : 's'} configured` : 'No shifts configured yet.'}</p>{loading ? <LoadingState label="Loading shifts…" /> : <div className="shift-list">{shifts.map((shift) => <div className="shift-row" key={shift.id}><div><strong>{shift.name}</strong><small>{shift.startTime?.slice(0, 5)} – {shift.endTime?.slice(0, 5)}{shift.isOvernight ? ' · Overnight' : ''}</small><small>{(shift.weeklySchedules || []).filter((day) => day.isWorkingDay).map((day) => weekdays[day.weekday].slice(0, 3)).join(', ') || 'No working days'}</small></div><span>{shift.isActive ? 'Active' : 'Inactive'}</span></div>)}</div>}</section>
    </div>
    <section className="settings-card location-settings-card"><h2>GPS attendance locations</h2><p>Employees must be within the configured radius to use GPS clock-in.</p><form onSubmit={createLocation}><div className="form-grid"><label>Location name<input required value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} placeholder="Main office" /></label><label>Radius (meters)<input type="number" min="25" max="5000" required value={locationForm.radiusMeters} onChange={(e) => setLocationForm({ ...locationForm, radiusMeters: e.target.value })} /></label></div><div className="form-grid"><label>Latitude<input type="number" step="any" min="-90" max="90" required value={locationForm.latitude} onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })} placeholder="24.8607" /></label><label>Longitude<input type="number" step="any" min="-180" max="180" required value={locationForm.longitude} onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })} placeholder="67.0011" /></label></div><Button type="submit" loading={saving}>Add GPS location</Button></form><div className="shift-list">{locations.map((location) => <div className="shift-row" key={location.id}><div><strong>{location.name}</strong><small>{location.latitude}, {location.longitude} · {location.radiusMeters}m radius</small></div><span>{location.isActive ? 'Active' : 'Inactive'}</span></div>)}</div></section>
  </AppShell>;
}
