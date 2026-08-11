import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import AppShell from '../../components/common/AppShell.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import Button from '../../components/common/Button.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';

export default function SettingsPage({ user, onExit }) {
  const [company, setCompany] = useState({});
  const [hours, setHours] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/settings')
      .then((res) => { const d = res.data.data || {}; setCompany(d.company || {}); setHours(d.workHours || {}); })
      .catch((err) => setError(err.response?.data?.error?.message || 'Could not load settings.'))
      .finally(() => setLoading(false));
  }, []);

  async function saveCompany(event, notify) {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings', Object.fromEntries(new FormData(event.currentTarget)));
      setCompany(res.data.data.company);
      notify?.('Company profile saved');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save company profile.');
    } finally {
      setSaving(false);
    }
  }

  async function saveHours(event, notify) {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/settings/work-hours', Object.fromEntries(new FormData(event.currentTarget)));
      setHours(res.data.data.workHours);
      notify?.('Work-hour settings saved');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save work-hour settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <AppShell user={user} active="Settings" onExit={onExit}>
      <LoadingState label="Loading settings…" />
    </AppShell>
  );

  return (
    <AppShell user={user} active="Settings" onExit={onExit}>
      {({ notify }) => (
        <>
          <Breadcrumbs items={[{ label: 'Workspace' }, { label: 'Settings' }]} />
          <div className="page-heading">
            <div>
              <div className="eyebrow">Administration</div>
              <h1>Company settings</h1>
              <p>Manage your organization profile and attendance rules.</p>
            </div>
          </div>
          {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
          {!error && (
            <div className="settings-grid">
              <section className="settings-card">
                <h2>Company profile</h2>
                <p>Basic details shown across your workspace.</p>
                <form onSubmit={(e) => saveCompany(e, notify)}>
                  <label>Company name<input name="companyName" required defaultValue={company.companyName || ''} /></label>
                  <label>Industry<input name="industry" defaultValue={company.industry || ''} /></label>
                  <label>Address<textarea name="address" defaultValue={company.address || ''} /></label>
                  <label>Logo URL<input name="logoUrl" type="url" defaultValue={company.logoUrl || ''} placeholder="https://..." /></label>
                  <Button type="submit" loading={saving}>Save profile</Button>
                </form>
              </section>
              <section className="settings-card">
                <h2>Work hours</h2>
                <p>These settings control timezone and late-arrival detection.</p>
                <form onSubmit={(e) => saveHours(e, notify)}>
                  <label>Timezone<input name="timezone" required defaultValue={hours.timezone || 'Asia/Karachi'} /></label>
                  <label>Currency<input name="currency" maxLength="3" required defaultValue={hours.currency || 'PKR'} /></label>
                  <div className="form-grid">
                    <label>Work starts<input name="workStartTime" type="time" required defaultValue={hours.workStartTime?.slice(0, 5) || '09:00'} /></label>
                    <label>Work ends<input name="workEndTime" type="time" required defaultValue={hours.workEndTime?.slice(0, 5) || '17:00'} /></label>
                  </div>
                  <label>Late threshold<input name="lateThreshold" type="time" required defaultValue={hours.lateThreshold?.slice(0, 5) || '09:15'} /></label>
                  <Button type="submit" loading={saving}>Save work hours</Button>
                </form>
              </section>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
