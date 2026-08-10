import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, CheckCircle2, CircleAlert, FileText, Plus, RefreshCw, Target, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/common/Sidebar.jsx';
import Topbar from '../../components/common/Topbar.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Button from '../../components/common/Button.jsx';
import api from '../../services/api.js';

const tabs = [
  ['overview', 'Overview', ['admin', 'manager']], ['my', 'My Performance', ['employee']], ['cycles', 'Cycles', ['admin', 'manager']],
  ['criteria', 'Criteria', ['admin', 'manager']], ['goals', 'Goals', ['admin', 'manager', 'employee']],
  ['evidence', 'Evidence', ['admin', 'manager', 'employee']], ['reviews', 'Reviews', ['admin', 'manager', 'employee']],
  ['calibration', 'Calibration', ['admin', 'manager']], ['fairrank', 'FairRank', ['admin', 'manager']],
  ['readiness', 'Readiness', ['admin', 'manager']], ['rewards', 'Rewards', ['admin', 'manager']]
];
const endpoints = { cycles: '/performance/cycles', criteria: '/performance/templates', goals: '/performance/goals', evidence: '/performance/evidence', reviews: '/performance/reviews', readiness: '/performance/promotion-profiles', rewards: '/performance/rewards' };

function responseData(response) { return response?.data?.data ?? response?.data ?? []; }
function titleCase(value) { return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()); }

function SummaryCard({ label, value, icon: Icon, tone = 'violet' }) { return <article className={`performance-kpi ${tone}`}><span className="performance-kpi-icon"><Icon size={17} /></span><small>{label}</small><strong>{value}</strong></article>; }

function ListCard({ item, label }) {
  const name = item.name || item.title || item.employeeName || item.code || item.id;
  const detail = item.description || item.reason || item.designation || item.cycleType || item.type || '';
  return <article className="performance-list-card"><div><strong>{name}</strong><small>{detail}</small></div><StatusBadge status={titleCase(item.status || item.recommendation || 'info')} /></article>;
}

export default function FairRankPage({ user, onExit }) {
  const navigate = useNavigate();
  const role = user?.user?.role || user?.role || 'employee';
  const canManage = ['admin', 'manager'].includes(role);
  const canAdmin = role === 'admin';
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const visibleTabs = tabs.filter(([, , roles]) => roles.includes(role));

  const load = async () => {
    setLoading(true); setError('');
    try {
      if (tab === 'my') setData(responseData(await api.get('/performance/me')));
      else if (tab === 'overview') {
        const results = await Promise.allSettled([
          api.get('/performance/cycles'), api.get('/performance/rating-bands'), api.get('/performance/equivalence-settings'),
          api.get('/performance/signature-rules'), api.get('/performance/promotion-profiles')
        ]);
        setData({ overview: results.map(result => result.status === 'fulfilled' ? responseData(result.value) : null) });
      } else if (tab === 'calibration' || tab === 'fairrank') {
        const cycles = responseData(await api.get('/performance/cycles'));
        const cycle = cycles.find(item => ['active', 'in_progress'].includes(item.status)) || cycles[0];
        if (!cycle) setData({ items: [] });
        else setData({ items: responseData(await api.get(`/performance/cycles/${cycle.id}/${tab === 'calibration' ? 'calibration' : 'equivalence-groups'}`)) });
      } else setData({ items: responseData(await api.get(endpoints[tab])) });
    } catch (err) { setError(err.response?.data?.message || `Unable to load ${tab}. Please try again.`); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [tab]);

  const activeCycle = useMemo(() => (data.items || []).find(item => item.status === 'active') || (data.items || [])[0], [data.items]);
  const createCycle = async event => {
    event.preventDefault(); setSaving(true);
    const form = new FormData(event.currentTarget);
    try { await api.post('/performance/cycles', Object.fromEntries(form.entries())); setModal(false); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to create the performance cycle.'); }
    finally { setSaving(false); }
  };
  const go = label => { const path = { Overview: '/dashboard', People: '/employees', Attendance: '/attendance', 'Time off': '/leaves', Payroll: '/payroll', Departments: '/departments', Notifications: '/notifications', Settings: '/settings', FairRank: '/performance' }[label]; if (path) navigate(path); };

  return <div className="app performance-page"><Sidebar active="FairRank" role={role} open={mobileOpen} onClose={() => setMobileOpen(false)} onNavigate={go} onLogout={onExit} /><div className="app-content"><Topbar user={user} onMenu={() => setMobileOpen(true)} onLogout={onExit} /><main className="dashboard-main"><Breadcrumbs items={['Workspace', 'FairRank']} /><div className="page-heading performance-heading"><div><div className="eyebrow">PERFORMANCE MANAGEMENT</div><h1>FairRank</h1><p>Run evidence-based, explainable performance reviews across your workspace.</p></div>{canAdmin && <Button onClick={() => setModal(true)}><Plus size={16} /> New cycle</Button>}</div><nav className="performance-tabs" aria-label="Performance sections">{visibleTabs.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>{loading ? <LoadingState label="Loading performance data..." /> : error ? <ErrorState message={error} onRetry={load} /> : <section className="performance-content"><PageContent tab={tab} data={data} canManage={canManage} activeCycle={activeCycle} onRetry={load} /></section>}</main></div>{modal && <div className="modal-backdrop"><form className="modal performance-modal" onSubmit={createCycle}><button type="button" className="modal-close" onClick={() => setModal(false)}>×</button><h2>Create performance cycle</h2><p>Define the review period for your organization.</p><label>Cycle name<input name="name" required placeholder="2026 Annual Review" /></label><label>Year<input name="year" required type="number" min="2000" max="2100" defaultValue={new Date().getFullYear()} /></label><label>Cycle type<select name="cycleType" defaultValue="annual"><option value="annual">Annual</option><option value="quarterly">Quarterly</option><option value="probation">Probation</option></select></label><div className="performance-form-grid"><label>Start date<input name="startDate" required type="date" /></label><label>End date<input name="endDate" required type="date" /></label></div><Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create cycle'} <ArrowRight size={16} /></Button></form></div>}</div>;
}

function PageContent({ tab, data, canManage, activeCycle, onRetry }) {
  if (tab === 'my') return <MyPerformance data={data} />;
  if (tab === 'overview') { const values = data.overview || []; return <><div className="performance-kpis"><SummaryCard label="Review cycles" value={Array.isArray(values[0]) ? values[0].length : 0} icon={BarChart3} /><SummaryCard label="Rating bands" value={Array.isArray(values[1]) ? values[1].length : 0} icon={CheckCircle2} tone="mint" /><SummaryCard label="Promotion profiles" value={Array.isArray(values[4]) ? values[4].length : 0} icon={Target} tone="blue" /></div><div className="performance-grid"><article className="performance-card"><h2>Performance workflow</h2><p>Set expectations, collect evidence, review fairly, and explain every outcome.</p><div className="performance-workflow">{[['Goals', Target], ['Evidence', FileText], ['Reviews', Users], ['Calibration', BarChart3]].map(([label, Icon]) => <div key={label}><Icon size={19} /><span>{label}</span></div>)}</div></article><article className="performance-card"><h2>Latest cycle</h2>{activeCycle ? <ListCard item={activeCycle} label="cycle" /> : <EmptyState text="No performance cycles have been created yet." />}</article></div></>; }
  if (!canManage && ['cycles', 'criteria', 'calibration', 'fairrank', 'readiness', 'rewards'].includes(tab)) return <EmptyState text="This performance section is available to managers and administrators." />;
  const items = data.items || []; return <article className="performance-card"><div className="performance-card-heading"><div><h2>{titleCase(tab)}</h2><p>{items.length ? `${items.length} record${items.length === 1 ? '' : 's'} found.` : `Manage ${tab} using real workspace data.`}</p></div><button className="icon-button" onClick={onRetry} aria-label="Refresh"><RefreshCw size={17} /></button></div>{items.length ? <div className="performance-list">{items.map(item => <ListCard item={item} label={tab} key={item.id || item.code || item.name} />)}</div> : <EmptyState text={`No ${tab} records are available yet.`} />}</article>;
}
function EmptyState({ text }) { return <div className="performance-empty"><CircleAlert size={22} /><p>{text}</p></div>; }

function MyPerformance({ data }) {
  const reports = data.reports || [];
  return <div className="my-performance"><div className="performance-card"><h2>My performance</h2><p>Released appraisal results, achievements, and manager feedback visible only to you.</p><div className="performance-kpis"><SummaryCard label="Completed goals" value={(data.goals || []).filter(goal => goal.status === 'completed').length} icon={Target} tone="blue" /><SummaryCard label="Released reports" value={reports.length} icon={FileText} tone="mint" /></div></div>{reports.length ? reports.map(report => <article className="performance-card appraisal-report" key={report.id}><div className="performance-card-heading"><div><h2>{report.cycle?.name || 'Performance appraisal'}</h2><p>{report.cycle?.year || ''} · Released appraisal report</p></div><StatusBadge status={report.ratingBand || 'Released'} /></div><div className="appraisal-rating"><strong>{Number(report.finalScore).toFixed(2)}</strong><span>Final performance score</span></div><p>{report.performanceConclusion}</p>{report.criterionBreakdown?.length > 0 && <div className="appraisal-breakdown">{report.criterionBreakdown.map((line, index) => <div key={`${line.componentCode || line.label || 'criterion'}-${index}`}><span>{line.label || line.componentCode || 'Criterion'}</span><strong>{Number(line.amount ?? line.weightedScore ?? 0).toFixed(2)}</strong></div>)}</div>}{report.equivalenceConclusion && <div className="appraisal-note"><strong>FairRank conclusion</strong><p>{report.equivalenceConclusion}</p></div>}{report.performanceSignature && <p><strong>Performance signature:</strong> {report.performanceSignature}</p>}{report.promotionConclusion && <div className="appraisal-note"><strong>Promotion readiness</strong><p>{report.promotionConclusion}</p></div>}</article>) : <div className="performance-card"><EmptyState text="Your finalized appraisal report has not been released yet." /></div>}<article className="performance-card"><h2>Goals and achievements</h2>{data.goals?.length ? <div className="performance-list">{data.goals.map(goal => <ListCard key={goal.id} item={goal} label="goal" />)}</div> : <EmptyState text="No completed goals are available for released cycles." />}</article><article className="performance-card"><h2>Manager feedback</h2>{data.feedback?.length ? <div className="feedback-list">{data.feedback.map(feedback => <div className="feedback-item" key={feedback.id}><strong>{feedback.cycle?.name || 'Performance cycle'}</strong><p>{feedback.strengths || 'No strengths recorded.'}</p><p>{feedback.improvementAreas || 'No development areas recorded.'}</p><small>{feedback.comments || ''}</small></div>)}</div> : <EmptyState text="No released manager feedback is available yet." />}</article></div>;
}
