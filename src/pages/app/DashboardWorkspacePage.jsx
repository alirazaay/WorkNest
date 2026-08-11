import AppShell from '../../components/common/AppShell.jsx';
import DashboardPage from './ResilientDashboardPage.jsx';

export default function DashboardWorkspacePage({ user, onExit }) {
  return (
    <AppShell user={user} active="Overview" onExit={onExit}>
      <DashboardPage user={user} />
    </AppShell>
  );
}
