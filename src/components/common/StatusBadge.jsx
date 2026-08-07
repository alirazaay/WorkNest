const statusMap = { active: 'success', approved: 'success', present: 'success', pending: 'warning', late: 'warning', rejected: 'error', terminated: 'error', absent: 'error', 'on-leave': 'info', inactive: 'neutral' };

export default function StatusBadge({ status, children }) {
  const value = String(status || children || '').replaceAll('-', ' ');
  return <span className={`status-badge ${statusMap[String(status || '').toLowerCase()] || 'neutral'}`}>{value || 'Unknown'}</span>;
}
