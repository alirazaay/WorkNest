import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import AppShell from '../../components/common/AppShell.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import Button from '../../components/common/Button.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';

export default function NotificationsPage({ user, onExit }) {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/notifications');
      setItems(res.data.data?.items || []);
      setUnread(res.data.data?.unreadCount || 0);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((curr) => curr.map((item) => item.id === id ? { ...item, isRead: true } : item));
      setUnread((curr) => Math.max(0, curr - 1));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not update notification.');
    }
  }

  async function markAllRead(notify) {
    try {
      await api.patch('/notifications/read-all');
      setItems((curr) => curr.map((item) => ({ ...item, isRead: true })));
      setUnread(0);
      notify?.('All notifications marked as read');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not update notifications.');
    }
  }

  return (
    <AppShell user={user} active="Notifications" onExit={onExit}>
      {({ notify }) => (
        <>
          <Breadcrumbs items={[{ label: 'Workspace' }, { label: 'Notifications' }]} />
          <div className="page-heading">
            <div>
              <div className="eyebrow">Workspace</div>
              <h1>Notifications</h1>
              <p>{unread ? `${unread} unread notification${unread === 1 ? '' : 's'}` : 'You are all caught up.'}</p>
            </div>
            {unread > 0 && <Button variant="secondary" size="sm" onClick={() => markAllRead(notify)}>Mark all as read</Button>}
          </div>
          {error && <ErrorState message={error} onRetry={load} />}
          {loading && !error && <LoadingState label="Loading notifications…" />}
          {!loading && !error && (
            <div className="notification-list">
              {items.map((item) => (
                <article
                  className={`notification-card ${item.isRead ? 'read' : 'unread'}`}
                  key={item.id}
                  onClick={() => { if (!item.isRead) markRead(item.id); if (item.entityType?.startsWith('performance')) navigate('/performance'); }}
                >
                  <div className="notification-icon">{item.type?.startsWith('leave') ? '📋' : '•'}</div>
                  <div className="notification-copy">
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <time>{new Date(item.createdAt).toLocaleString()}</time>
                  </div>
                  {!item.isRead && <span className="unread-dot" aria-label="Unread" />}
                </article>
              ))}
              {!items.length && <div className="notification-empty">No notifications yet.</div>}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
