import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, CheckCircle2, CircleAlert, ClipboardList, FileText, LineChart, Plus, RefreshCw, Target, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/common/AppShell.jsx';
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
  ['calibration', 'Calibration', ['admin', 'manager']], ['fairrank', 'FairRank', ['admin', 'manager']], ['continuity', 'Continuity', ['admin', 'manager', 'employee']], ['tna', 'TNA', ['admin', 'manager', 'employee']],
  ['readiness', 'Readiness', ['admin', 'manager']], ['rewards', 'Rewards', ['admin', 'manager']], ['comparison', 'Compare', ['admin', 'manager']], ['audit', 'Audit log', ['admin']],
];
const endpoints = { cycles: '/performance/cycles', criteria: '/performance/templates', goals: '/performance/goals', evidence: '/performance/evidence', reviews: '/performance/reviews', readiness: '/performance/promotion-profiles', rewards: '/performance/rewards', audit: '/performance/audit' };

function responseData(res) { return res?.data?.data ?? res?.data ?? []; }
function titleCase(v) { return String(v || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }

function SummaryCard({ label, value, icon: Icon, tone = 'violet' }) { return <article className={`performance-kpi ${tone}`}><span className="performance-kpi-icon"><Icon size={17} /></span><small>{label}</small><strong>{value}</strong></article>; }

function ListCard({ item }) {
  const name = item.name || item.title || item.employeeName || item.code || item.id;
  const detail = item.description || item.reason || item.designation || item.cycleType || item.type || '';
  return <article className="performance-list-card"><div><strong>{name}</strong><small>{detail}</small></div><StatusBadge status={titleCase(item.status || item.recommendation || 'info')} /></article>;
}

export default function FairRankPage({ user, onExit }) {
  const navigate = useNavigate();
  const role = user?.user?.role || user?.role || 'employee';
  const canManage = ['admin', 'manager'].includes(role);
  const canAdmin = role === 'admin';

  const [tab, setTab] = useState(() => role === 'employee' ? 'my' : 'overview');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const visibleTabs = tabs.filter(([, , roles]) => roles.includes(role));

  // Fixed: wrapped in useCallback([tab]) so the function reference is stable
  // and useEffect([load]) only fires when tab actually changes.
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'my') {
        setData(responseData(await api.get('/performance/me')));
      } else if (tab === 'comparison') {
        const [empRes, cycleRes] = await Promise.all([api.get('/employees', { params: { page: 1, pageSize: 100 } }), api.get('/performance/cycles')]);
        const empData = responseData(empRes);
        setData({ employees: empData?.items || empData || [], cycles: responseData(cycleRes) });
      } else if (tab === 'overview') {
        const results = await Promise.allSettled([
          api.get('/performance/cycles'), api.get('/performance/rating-bands'), api.get('/performance/equivalence-settings'),
          api.get('/performance/signature-rules'), api.get('/performance/promotion-profiles'),
        ]);
        if (results.every((r) => r.status === 'rejected')) throw results[0].reason;
        setData({ overview: results.map((r) => r.status === 'fulfilled' ? responseData(r.value) : null) });
      } else if (tab === 'continuity') {
        if (role === 'employee') setData({ employees: [], history: responseData(await api.get('/performance/me/continuity')) });
        else { const empData = responseData(await api.get('/employees', { params: { page: 1, pageSize: 100 } })); const employees = empData?.items || empData || []; const history = employees[0] ? responseData(await api.get(`/performance/employees/${employees[0].id}/history`)) : null; setData({ employees, history }); }
      } else if (tab === 'tna') {
        if (role === 'employee') { const result = responseData(await api.get('/performance/me/development-signals')); setData({ items: (result.signals || []).map((item) => ({ ...item, signalCode: item.code, employee: result.employee, status: 'identified', priority: item.code === 'MISSING_REVIEW_DATA' ? 'low' : 'high', recommendedTraining: 'Review this development signal with your manager.' })) }); }
        else setData({ items: responseData(await api.get('/performance/training-needs')) });
      } else if (tab === 'calibration' || tab === 'fairrank') {
        const cycles = responseData(await api.get('/performance/cycles'));
        const cycle = cycles.find((c) => ['active', 'in_progress'].includes(c.status)) || cycles[0];
        if (!cycle) setData({ items: [] });
        else setData({ items: responseData(await api.get(`/performance/cycles/${cycle.id}/${tab === 'calibration' ? 'calibration' : 'equivalence-groups'}`)) });
      } else if (tab === 'goals') {
        const [goalsRes, cyclesRes] = await Promise.all([api.get(endpoints[tab]), api.get('/performance/cycles')]); setData({ items: responseData(goalsRes), cycles: responseData(cyclesRes) });
      } else {
        setData({ items: responseData(await api.get(endpoints[tab])) });
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || `Unable to load ${tab}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, [role, tab]);

  useEffect(() => { load(); }, [load]);

  const activeCycle = useMemo(() => (data.items || []).find((item) => item.status === 'active') || (data.items || [])[0], [data.items]);

  const createCycle = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/performance/cycles', Object.fromEntries(new FormData(event.currentTarget)));
      setModal(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Unable to create the performance cycle.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell user={user} active="FairRank" onExit={onExit}>
      <Breadcrumbs items={['Workspace', 'FairRank']} />
      <div className="page-heading performance-heading">
        <div>
          <div className="eyebrow">PERFORMANCE MANAGEMENT</div>
          <h1>FairRank</h1>
          <p>Run evidence-based, explainable performance reviews across your workspace.</p>
        </div>
        {canAdmin && <Button onClick={() => setModal(true)}><Plus size={16} /> New cycle</Button>}
      </div>
      <nav className="performance-tabs" aria-label="Performance sections">
        {visibleTabs.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}
      </nav>
      {loading ? <LoadingState label="Loading performance data..." /> : error ? <ErrorState message={error} onRetry={load} /> : (
        <section className="performance-content">
          <PageContent tab={tab} data={data} canManage={canManage} activeCycle={activeCycle} onRetry={load} setData={setData} />
        </section>
      )}
      {modal && (
        <div className="modal-backdrop">
          <form className="modal performance-modal" onSubmit={createCycle}>
            <button type="button" className="modal-close" onClick={() => setModal(false)}>×</button>
            <h2>Create performance cycle</h2>
            <p>Define the review period for your organization.</p>
            <label>Cycle name<input name="name" required placeholder="2026 Annual Review" /></label>
            <label>Year<input name="year" required type="number" min="2000" max="2100" defaultValue={new Date().getFullYear()} /></label>
            <label>Cycle type<select name="cycleType" defaultValue="annual"><option value="annual">Annual</option><option value="quarterly">Quarterly</option><option value="probation">Probation</option></select></label>
            <div className="performance-form-grid">
              <label>Start date<input name="startDate" required type="date" /></label>
              <label>End date<input name="endDate" required type="date" /></label>
            </div>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create cycle'} <ArrowRight size={16} /></Button>
          </form>
        </div>
      )}
    </AppShell>
  );
}

function PageContent({ tab, data, canManage, activeCycle, onRetry, setData }) {
  if (tab === 'my') return <MyPerformance data={data} />;
  if (tab === 'audit') return <AuditList items={data.items || []} />;
  if (tab === 'comparison') return <Comparison employees={data.employees || []} cycles={data.cycles || []} />;
  if (tab === 'fairrank') return <FairRankGroups items={data.items || []} />;
  if (tab === 'continuity') return <ContinuityWorkspace data={data} onRetry={onRetry} setData={setData} canManage={canManage} />;
  if (tab === 'tna') return <TnaWorkspace items={data.items || []} onRetry={onRetry} />;
  if (tab === 'goals') return <GoalsWorkspace items={data.items || []} cycles={data.cycles || []} onRetry={onRetry} canManage={canManage} />;
  if (tab === 'overview') {
    const values = data.overview || [];
    return <>
      <div className="performance-kpis">
        <SummaryCard label="Review cycles" value={Array.isArray(values[0]) ? values[0].length : 0} icon={BarChart3} />
        <SummaryCard label="Rating bands" value={Array.isArray(values[1]) ? values[1].length : 0} icon={CheckCircle2} tone="mint" />
        <SummaryCard label="Promotion profiles" value={Array.isArray(values[4]) ? values[4].length : 0} icon={Target} tone="blue" />
      </div>
      <div className="performance-grid">
        <article className="performance-card">
          <h2>Performance workflow</h2>
          <p>Set expectations, collect evidence, review fairly, and explain every outcome.</p>
          <div className="performance-workflow">{[['Goals', Target], ['Evidence', FileText], ['Reviews', Users], ['Calibration', BarChart3]].map(([label, Icon]) => <div key={label}><Icon size={19} /><span>{label}</span></div>)}</div>
        </article>
        <article className="performance-card">
          <h2>Latest cycle</h2>
          {activeCycle ? <ListCard item={activeCycle} /> : <EmptyState text="No performance cycles have been created yet." />}
        </article>
      </div>
    </>;
  }
  if (!canManage && ['cycles', 'criteria', 'calibration', 'fairrank', 'readiness', 'rewards'].includes(tab)) return <EmptyState text="This performance section is available to managers and administrators." />;
  const items = data.items || [];
  return (
    <article className="performance-card">
      <div className="performance-card-heading">
        <div><h2>{titleCase(tab)}</h2><p>{items.length ? `${items.length} record${items.length === 1 ? '' : 's'} found.` : `Manage ${tab} using real workspace data.`}</p></div>
        <button className="icon-button" onClick={onRetry} aria-label="Refresh"><RefreshCw size={17} /></button>
      </div>
      {items.length ? <div className="performance-list">{items.map((item) => <ListCard item={item} key={item.id || item.code || item.name} />)}</div> : <EmptyState text={`No ${tab} records are available yet.`} />}
    </article>
  );
}

function FairRankGroups({ items }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  return <>
    <article className="performance-card">
      <div className="performance-card-heading">
        <div><h2>Performance equivalents</h2><p>{items.length ? `${items.length} equivalent group${items.length === 1 ? '' : 's'} found.` : 'Groups are created from calculated scores, rating bands, and the configured threshold.'}</p></div>
      </div>
      {items.length ? <div className="performance-list">{items.map((group) => {
        const members = group.members || [];
        const scores = members.map((member) => Number(member.finalScore)).filter(Number.isFinite);
        const spread = scores.length ? (Math.max(...scores) - Math.min(...scores)).toFixed(2) : '—';
        return <article className="performance-list-card" key={group.id}>
          <div><strong>Equivalent group #{group.id}</strong><small>{members.length} employees · score spread {spread} points</small></div>
          <button type="button" className="status-badge info performance-info-button" onClick={() => setSelectedGroup(group)} aria-label={`View details for equivalent group ${group.id}`}>Info</button>
        </article>;
      })}</div> : <EmptyState text="No performance-equivalent groups are available for the selected cycle." />}
    </article>
    {selectedGroup && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedGroup(null)}>
      <section className="modal performance-info-modal" role="dialog" aria-modal="true" aria-labelledby="fairrank-group-title">
        <button type="button" className="modal-close" onClick={() => setSelectedGroup(null)} aria-label="Close group details">×</button>
        <h2 id="fairrank-group-title">Equivalent group #{selectedGroup.id}</h2>
        <p>Members are grouped within the configured FairRank threshold and rating band.</p>
        <div className="performance-info-summary"><span>Rating band: <strong>{selectedGroup.ratingBand || 'Unbanded'}</strong></span><span>Threshold: <strong>{selectedGroup.thresholdUsed ?? '—'}</strong></span></div>
        <div className="performance-info-members">{(selectedGroup.members || []).map((member) => <div key={member.id || `${member.employeeId}-${member.finalScore}`}><span>{member.employee?.user?.name || member.employee?.employeeCode || `Employee ${member.employeeId}`}</span><strong>{Number(member.finalScore).toFixed(2)}</strong></div>)}</div>
      </section>
    </div>}
  </>;
}

function ContinuityWorkspace({ data, onRetry, setData, canManage }) {
  const employees = data.employees || []; const history = data.history; const [employeeId, setEmployeeId] = useState(employees[0]?.id || ''); const [loadingEmployee, setLoadingEmployee] = useState(false); const [analyzing, setAnalyzing] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => { if (!employeeId && employees[0]?.id) setEmployeeId(employees[0].id); }, [employeeId, employees]);
  async function selectEmployee(event) { const id = event.target.value; setEmployeeId(id); if (!id) return; setLoadingEmployee(true); setMessage(''); try { const res = await api.get(`/performance/employees/${id}/history`); setData((current) => ({ ...current, history: responseData(res) })); } catch (err) { setMessage(err.response?.data?.error?.message || 'Unable to load employee history.'); } finally { setLoadingEmployee(false); } }
  async function analyze() { if (!employeeId) return; setAnalyzing(true); setMessage(''); try { await api.post(`/performance/employees/${employeeId}/analyze-tna`, {}); setMessage('Development signals analyzed successfully.'); } catch (err) { setMessage(err.response?.data?.error?.message || 'Unable to analyze development needs.'); } finally { setAnalyzing(false); } }
  return <div className="continuity-workspace">
    <article className="performance-card">
      <div className="performance-card-heading"><div><h2>Performance continuity</h2><p>Review historical ratings without fabricating missing years or detailed criterion scores.</p></div><button className="icon-button" onClick={onRetry} aria-label="Refresh continuity"><RefreshCw size={17} /></button></div>
      {canManage ? <label className="comparison-cycle">Employee<select value={employeeId} onChange={selectEmployee}><option value="">Select an employee</option>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.user?.name || employee.employeeCode} ({employee.employeeCode})</option>)}</select></label> : <p className="performance-inline-message">Showing your permitted historical performance information.</p>}
      {message && <p className="performance-inline-message">{message}</p>}
      {loadingEmployee ? <LoadingState label="Loading employee history..." /> : history ? <>
        <div className="performance-kpis continuity-kpis"><SummaryCard label="Years reviewed" value={history.summary?.yearsReviewed ?? 0} icon={LineChart} /><SummaryCard label="Average rating" value={history.summary?.averageHistoricalRating == null ? '—' : `${history.summary.averageHistoricalRating}/5`} icon={BarChart3} tone="blue" /><SummaryCard label="Latest rating" value={history.summary?.latestRating == null ? '—' : `${history.summary.latestRating}/5`} icon={ClipboardList} tone="mint" /></div>
        <div className="continuity-timeline">{(history.timeline || []).map((row) => <div className={`continuity-year ${row.status === 'no_review_data' ? 'missing' : ''}`} key={row.year}><strong>{row.year}</strong><span>{row.originalRating == null ? 'No Review Data' : `${row.originalRating}/5`}</span><StatusBadge status={row.trend === 'insufficient_history' ? 'neutral' : row.trend} /><small>{row.changeFromPreviousYear == null ? 'Baseline / insufficient history' : `${row.changeFromPreviousYear > 0 ? '+' : ''}${row.changeFromPreviousYear} from previous year`}</small></div>)}</div>
        <div className="continuity-summary"><span>Best: {history.summary?.bestRating ?? '—'}/5</span><span>Worst: {history.summary?.worstRating ?? '—'}/5</span><span>Volatility: {history.summary?.ratingVolatility ?? '—'}</span><span>Missing years: {history.summary?.missingReviewYears?.length ? history.summary.missingReviewYears.join(', ') : 'None'}</span></div>
        {canManage && <Button onClick={analyze} disabled={analyzing || !employeeId}>{analyzing ? 'Analyzing...' : 'Analyze TNA'} <ArrowRight size={16} /></Button>}
      </> : <EmptyState text={employees.length ? 'Select an employee to view historical continuity.' : 'No employees are available.'} />}
    </article>
  </div>;
}

function TnaWorkspace({ items, onRetry }) {
  const [priority, setPriority] = useState(''); const [status, setStatus] = useState(''); const [signal, setSignal] = useState(''); const filtered = items.filter((item) => (!priority || item.priority === priority) && (!status || item.status === status) && (!signal || item.signalCode === signal));
  return <article className="performance-card"><div className="performance-card-heading"><div><h2>Training Needs Analysis</h2><p>Deterministic development signals from historical performance continuity.</p></div><button className="icon-button" onClick={onRetry} aria-label="Refresh training needs"><RefreshCw size={17} /></button></div><div className="tna-filters"><select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">All priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="identified">Identified</option><option value="reviewed">Reviewed</option><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select><select value={signal} onChange={(e) => setSignal(e.target.value)}><option value="">All signals</option>{[...new Set(items.map((item) => item.signalCode).filter(Boolean))].map((value) => <option value={value} key={value}>{titleCase(value)}</option>)}</select></div>{filtered.length ? <div className="performance-list">{filtered.map((item) => <article className="performance-list-card tna-card" key={item.id}><div><strong>{item.employee?.user?.name || item.employee?.employeeCode || 'Employee'}</strong><small>{titleCase(item.signalCode || 'MANUAL')} · {item.reason}</small><small>Recommended: {item.recommendedTraining || 'Review with manager'}</small></div><div><StatusBadge status={item.priority} /><StatusBadge status={item.status} /></div></article>)}</div> : <EmptyState text="No training needs match the selected filters." />}</article>;
}

function GoalsWorkspace({ items, cycles, onRetry, canManage }) {
  const [targetCycles, setTargetCycles] = useState({}); const [message, setMessage] = useState(''); const incomplete = items.filter((item) => !['completed', 'cancelled'].includes(item.status) && Number(item.progressPercentage || 0) < 100);
  async function carryForward(goal) { const targetCycleId = targetCycles[goal.id]; if (!targetCycleId) return; setMessage(''); try { await api.post(`/performance/goals/${goal.id}/carry-forward`, { targetCycleId: Number(targetCycleId) }); setMessage('Goal carried forward successfully.'); onRetry(); } catch (err) { setMessage(err.response?.data?.error?.message || 'Unable to carry forward this goal.'); } }
  return <article className="performance-card"><div className="performance-card-heading"><div><h2>Goals and continuity</h2><p>Completed goals remain historical. Only incomplete goals can be explicitly carried forward.</p></div><button className="icon-button" onClick={onRetry} aria-label="Refresh goals"><RefreshCw size={17} /></button></div>{message && <p className="performance-inline-message">{message}</p>}{items.length ? <div className="performance-list">{items.map((goal) => <article className="performance-list-card goal-continuity-card" key={goal.id}><div><strong>{goal.title}</strong><small>{goal.cycle?.name || 'Performance cycle'} · {titleCase(goal.status)} · {Number(goal.progressPercentage || 0)}% complete</small><small>Continuity: {titleCase(goal.continuityStatus || 'not_applicable')}</small></div>{canManage && incomplete.some((item) => item.id === goal.id) && <div className="goal-carry-forward"><select value={targetCycles[goal.id] || ''} onChange={(event) => setTargetCycles((current) => ({ ...current, [goal.id]: event.target.value }))}><option value="">Carry to cycle...</option>{cycles.filter((cycle) => cycle.id !== goal.cycleId && !['completed', 'archived'].includes(cycle.status)).map((cycle) => <option value={cycle.id} key={cycle.id}>{cycle.name}</option>)}</select><button className="table-link" disabled={!targetCycles[goal.id]} onClick={() => carryForward(goal)}>Carry forward</button></div>}</article>)}</div> : <EmptyState text="No performance goals are available." />}</article>;
}

function EmptyState({ text }) { return <div className="performance-empty"><CircleAlert size={22} /><p>{text}</p></div>; }

function AuditList({ items }) {
  return (
    <article className="performance-card">
      <div className="performance-card-heading"><div><h2>FairRank audit log</h2><p>Tenant-scoped sensitive performance actions. Private before/after payloads are intentionally not exposed here.</p></div></div>
      {items.length ? <div className="performance-list">{items.map((item) => <article className="performance-list-card" key={item.id}><div><strong>{titleCase(item.action)}</strong><small>{item.entityType} #{item.entityId || '—'} · {item.actor?.name || 'System'} · {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</small></div><StatusBadge status="Recorded" /></article>)}</div> : <EmptyState text="No FairRank audit events have been recorded yet." />}
    </article>
  );
}

function Comparison({ employees, cycles }) {
  const [selected, setSelected] = useState([]);
  const [cycleId, setCycleId] = useState(cycles[0]?.id || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggle = (id) => setSelected((curr) => curr.includes(id) ? curr.filter((v) => v !== id) : curr.length < 5 ? [...curr, id] : curr);

  const compare = async () => {
    if (selected.length < 2 || !cycleId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/performance/compare', { cycleId: Number(cycleId), employeeIds: selected });
      setResult(responseData(res));
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Unable to compare these employees. Select a performance cycle with calculated scores.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="performance-card">
      <h2>FairRank comparison</h2>
      <p>Select 2–5 employees to compare their calculated performance results.</p>
      <label className="comparison-cycle">Performance cycle
        <select value={cycleId} onChange={(e) => { setCycleId(e.target.value); setResult(null); }}>
          <option value="">Select a cycle</option>
          {cycles.map((c) => <option value={c.id} key={c.id}>{c.name} ({c.year})</option>)}
        </select>
      </label>
      <div className="comparison-picker">
        {employees.map((emp) => (
          <label key={emp.id}>
            <input type="checkbox" checked={selected.includes(emp.id)} onChange={() => toggle(emp.id)} />
            <span><strong>{emp.user?.name || emp.name || emp.employeeCode}</strong><small>{emp.employeeCode || emp.designation || ''}</small></span>
          </label>
        ))}
      </div>
      {error && <p className="performance-inline-error">{error}</p>}
      <Button onClick={compare} disabled={selected.length < 2 || !cycleId || loading}>{loading ? 'Comparing...' : 'Compare selected'} <ArrowRight size={16} /></Button>
      {result && (
        <div className="comparison-result">
          <div className={result.comparison?.equivalent ? 'comparison-conclusion equivalent' : 'comparison-conclusion'}>
            <strong>{result.comparison?.conclusion}</strong>
            <span>Spread: {result.comparison?.spread} · Threshold: {result.comparison?.threshold}</span>
          </div>
          <div className="performance-list">
            {(result.employees || []).map((item) => (
              <div className="performance-list-card" key={item.employee.id}>
                <div><strong>{item.employee.name || item.employee.employeeCode}</strong><small>{item.employee.designation || ''} · {item.signature || 'Signature pending'}</small></div>
                <span><strong>{item.score.toFixed(2)}</strong><small>{item.ratingBand || 'Unrated'}</small></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function MyPerformance({ data }) {
  const reports = data.reports || [];
  return (
    <div className="my-performance">
      <div className="performance-card">
        <h2>My performance</h2>
        <p>Released appraisal results, achievements, and manager feedback visible only to you.</p>
        <div className="performance-kpis">
          <SummaryCard label="Completed goals" value={(data.goals || []).filter((g) => g.status === 'completed').length} icon={Target} tone="blue" />
          <SummaryCard label="Released reports" value={reports.length} icon={FileText} tone="mint" />
        </div>
      </div>
      {reports.length ? reports.map((report) => (
        <article className="performance-card appraisal-report" key={report.id}>
          <div className="performance-card-heading">
            <div><h2>{report.cycle?.name || 'Performance appraisal'}</h2><p>{report.cycle?.year || ''} · Released appraisal report</p></div>
            <StatusBadge status={report.ratingBand || 'Released'} />
          </div>
          <div className="appraisal-rating"><strong>{Number(report.finalScore).toFixed(2)}</strong><span>Final performance score</span></div>
          <p>{report.performanceConclusion}</p>
          {report.criterionBreakdown?.length > 0 && (
            <div className="appraisal-breakdown">
              {report.criterionBreakdown.map((line, i) => <div key={`${line.componentCode || line.label || 'criterion'}-${i}`}><span>{line.label || line.componentCode || 'Criterion'}</span><strong>{Number(line.amount ?? line.weightedScore ?? 0).toFixed(2)}</strong></div>)}
            </div>
          )}
          {report.equivalenceConclusion && <div className="appraisal-note"><strong>FairRank conclusion</strong><p>{report.equivalenceConclusion}</p></div>}
          {report.performanceSignature && <p><strong>Performance signature:</strong> {report.performanceSignature}</p>}
          {report.promotionConclusion && <div className="appraisal-note"><strong>Promotion readiness</strong><p>{report.promotionConclusion}</p></div>}
        </article>
      )) : <div className="performance-card"><EmptyState text="Your finalized appraisal report has not been released yet." /></div>}
      <article className="performance-card">
        <h2>Goals and achievements</h2>
        {data.goals?.length ? <div className="performance-list">{data.goals.map((goal) => <ListCard key={goal.id} item={goal} />)}</div> : <EmptyState text="No completed goals are available for released cycles." />}
      </article>
      <article className="performance-card">
        <h2>Manager feedback</h2>
        {data.feedback?.length ? (
          <div className="feedback-list">
            {data.feedback.map((fb) => <div className="feedback-item" key={fb.id}><strong>{fb.cycle?.name || 'Performance cycle'}</strong><p>{fb.strengths || 'No strengths recorded.'}</p><p>{fb.improvementAreas || 'No development areas recorded.'}</p><small>{fb.comments || ''}</small></div>)}
          </div>
        ) : <EmptyState text="No released manager feedback is available yet." />}
      </article>
    </div>
  );
}
