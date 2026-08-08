import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BarChart3, CalendarCheck2, Clock3, RefreshCw, Users, WalletCards } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../../services/dashboardService.js';
import LoadingState from '../../components/common/LoadingState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';

const emptySummary = { totalEmployees: 0, presentToday: 0, onLeaveToday: 0, pendingApprovals: 0, attendanceRateToday: 0 };

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export default function ResilientDashboardPage({ user }) {
  const navigate = useNavigate();
  const role = user?.user?.role || 'admin';
  const [widgets, setWidgets] = useState(null);
  const [errors, setErrors] = useState({});

  const load = useCallback(async () => {
    const requests = { summary: dashboardService.summary(), attendance: dashboardService.attendanceTrend(), activity: dashboardService.activity() };
    if (role === 'admin' || role === 'manager') requests.headcount = dashboardService.headcount();
    if (role === 'admin') requests.payroll = dashboardService.payrollTrend();
    const entries = Object.entries(requests);
    const results = await Promise.allSettled(entries.map(([, request]) => request));
    const next = {}; const nextErrors = {};
    entries.forEach(([key], index) => {
      const result = results[index];
      if (result.status === 'fulfilled') next[key] = result.value;
      else { nextErrors[key] = result.reason?.response?.data?.error?.message || 'Unable to load this widget.'; next[key] = key === 'summary' ? emptySummary : []; }
    });
    setWidgets(next); setErrors(nextErrors);
  }, [role]);

  useEffect(() => { load(); }, [load]);

  const firstName = user?.user?.name?.split(' ')[0] || 'there';
  const dateLabel = useMemo(() => new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date()), []);
  if (!widgets) return <LoadingState label="Loading dashboard…" />;

  const summary = widgets.summary || emptySummary;
  return <>
    <section className="dashboard-welcome">
      <div>
        <div className="eyebrow">{role === 'admin' ? 'Company overview' : 'Team overview'}</div>
        <h1>{greeting()}, {firstName} <span className="wave">✦</span></h1>
        <p>{dateLabel} · Here’s what’s happening across your workspace today.</p>
      </div>
      <div className="dashboard-actions"><button onClick={() => navigate('/employees')}><Users size={15} /> People</button><button onClick={() => navigate('/attendance')}><Clock3 size={15} /> Attendance</button></div>
    </section>

    <section className="kpi-grid dashboard-kpis">
      <Kpi icon={<Users size={17} />} label={role === 'admin' ? 'Total employees' : 'Team members'} value={summary.totalEmployees} detail="Across your workspace" />
      <Kpi icon={<CalendarCheck2 size={17} />} label="Present today" value={summary.presentToday} detail={`${summary.attendanceRateToday}% attendance rate`} tone="mint" />
      <Kpi icon={<CalendarCheck2 size={17} />} label="On leave today" value={summary.onLeaveToday} detail="Approved leave" tone="amber" />
      <Kpi icon={<Clock3 size={17} />} label="Pending approvals" value={summary.pendingApprovals} detail="Needs your attention" tone="pink" />
    </section>

    <section className="dashboard-grid dashboard-chart-row">
      <Widget title="Attendance trend" subtitle="Your team’s attendance over time" icon={<BarChart3 size={16} />} error={errors.attendance} retry={load}>
        {widgets.attendance.length ? <ResponsiveContainer width="100%" height={238}><LineChart data={widgets.attendance.map(item => ({ ...item, label: item.month.slice(5) }))} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#ececf2" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={11} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} fontSize={11} /><Tooltip /><Line type="monotone" dataKey="attendanceRate" stroke="#7265e6" strokeWidth={3} dot={{ r: 3, fill: '#7265e6', strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer> : <EmptyWidget text="No attendance data yet." />}
      </Widget>
      <Widget title="Department headcount" subtitle="People across your teams" icon={<Users size={16} />} error={errors.headcount} retry={load}>
        {widgets.headcount.length ? <ResponsiveContainer width="100%" height={238}><BarChart data={widgets.headcount} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#ececf2" vertical={false} /><XAxis dataKey="department" axisLine={false} tickLine={false} fontSize={10} /><YAxis axisLine={false} tickLine={false} fontSize={11} /><Tooltip /><Bar dataKey="count" fill="#8a7ef3" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyWidget text="No department data yet." />}
      </Widget>
    </section>

    <section className="dashboard-grid dashboard-lower-row">
      <Widget title="Recent activity" subtitle="The latest updates from your team" icon={<RefreshCw size={16} />} error={errors.activity} retry={load}>
        {widgets.activity.length ? <div className="activity-list polished-activity">{widgets.activity.slice(0, 6).map(item => <div className="activity-row" key={`${item.type}-${item.id}`}><span className="activity-dot" /><div><strong>{item.message}</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small></div><StatusBadge status={item.status} /></div>)}</div> : <EmptyWidget text="No recent activity." />}
      </Widget>
      {role === 'admin' && <Widget title="Payroll cost" subtitle="Net payroll by month" icon={<WalletCards size={16} />} error={errors.payroll} retry={load}>
        {widgets.payroll.length ? <ResponsiveContainer width="100%" height={238}><BarChart data={widgets.payroll} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#ececf2" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={10} /><YAxis axisLine={false} tickLine={false} fontSize={11} /><Tooltip /><Bar dataKey="net" fill="#57b186" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <EmptyWidget text="No payroll runs generated." />}
      </Widget>}
    </section>
  </>;
}

function Kpi({ icon, label, value, detail, tone = 'violet' }) {
  return <div className="kpi-card polished-kpi"><div className={`kpi-icon ${tone}`}>{icon}</div><div className="kpi-copy"><small>{label}</small><strong>{value}</strong><span className={tone === 'mint' ? 'positive' : ''}>{detail}</span></div><ArrowUpRight className="kpi-arrow" size={16} /></div>;
}

function Widget({ title, subtitle, icon, error, retry, children }) {
  return <div className="panel dashboard-widget polished-widget"><div className="panel-heading"><div className="widget-title"><span className="widget-icon">{icon}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div><button className="widget-menu" onClick={retry} aria-label={`Refresh ${title}`}><RefreshCw size={14} /></button></div>{error ? <div className="widget-error" role="alert"><p>{error}</p><button onClick={retry}>Try again</button></div> : children}</div>;
}

function EmptyWidget({ text }) { return <div className="widget-empty"><span>✦</span>{text}</div>; }
