import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BarChart3, CheckCircle2, CircleAlert, ClipboardList, FileText, LineChart, Plus, RefreshCw, Target, Users, Award, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/common/AppShell.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import LoadingState from '../../components/common/LoadingState.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Button from '../../components/common/Button.jsx';
import api from '../../services/api.js';

// All role checks and tab keys are preserved exactly — only the visual grouping changes.
const TAB_GROUPS = [
  {
    label: 'Setup',
    tabs: [
      ['cycles',   'Cycles',   ['admin', 'manager']],
      ['criteria', 'Criteria', ['admin', 'manager']],
    ],
  },
  {
    label: 'Performance',
    tabs: [
      ['goals',    'Goals',    ['admin', 'manager', 'employee']],
      ['evidence', 'Evidence', ['admin', 'manager', 'employee']],
      ['reviews',  'Reviews',  ['admin', 'manager', 'employee']],
    ],
  },
  {
    label: 'Evaluation',
    tabs: [
      ['calibration', 'Calibration', ['admin', 'manager']],
      ['fairrank',    'FairRank',    ['admin', 'manager']],
      ['comparison',  'Compare',     ['admin', 'manager']],
    ],
  },
  {
    label: 'Decisions',
    tabs: [
      ['readiness', 'Readiness', ['admin', 'manager']],
      ['rewards',   'Rewards',   ['admin', 'manager']],
    ],
  },
  {
    label: 'Development',
    tabs: [
      ['continuity', 'Continuity', ['admin', 'manager', 'employee']],
      ['tna',        'TNA',        ['admin', 'manager', 'employee']],
    ],
  },
  {
    label: 'Governance',
    tabs: [
      ['audit', 'Audit log', ['admin']],
    ],
  },
];
const endpoints = { cycles: '/performance/cycles', criteria: '/performance/criteria', goals: '/performance/goals', evidence: '/performance/evidence', reviews: '/performance/reviews', readiness: '/performance/promotion-profiles', rewards: '/performance/rewards', audit: '/performance/audit' };

function responseData(res) { const payload = res?.data?.data ?? res?.data ?? []; return payload?.items ?? payload; }
function responsePagination(res) { const payload = res?.data?.data ?? res?.data ?? {}; return payload?.pagination || null; }
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
  const [formError, setFormError] = useState('');
  const tabCache = useRef(new Map());
  const [page, setPage] = useState(1);
  const [actionResult, setActionResult] = useState(null);

  // Filter each group down to tabs the current role can see; drop empty groups.
  const visibleGroups = TAB_GROUPS
    .map(group => ({ ...group, tabs: group.tabs.filter(([, , roles]) => roles.includes(role)) }))
    .filter(group => group.tabs.length > 0);

  // Fixed: wrapped in useCallback([tab]) so the function reference is stable
  // and useEffect([load]) only fires when tab actually changes.
  const load = useCallback(async ({ force = false } = {}) => {
    const cacheKey = `${tab}:${page}`;
    const cached = tabCache.current.get(cacheKey);
    if (cached && !force && Date.now() - cached.timestamp < 30_000) {
      setData(cached.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const startedAt = performance.now();
    const commit = (next, pagination = null) => { const value = pagination ? { ...next, pagination } : next; tabCache.current.set(cacheKey, { data: value, timestamp: Date.now() }); setData(value); };
    try {
      if (tab === 'my') {
        commit(responseData(await api.get('/performance/me')));
      } else if (tab === 'comparison') {
        const [empRes, cycleRes] = await Promise.all([api.get('/employees', { params: { page: 1, pageSize: 100 } }), api.get('/performance/cycles')]);
        const empData = responseData(empRes);
        commit({ employees: empData?.items || empData || [], cycles: responseData(cycleRes) });
      } else if (tab === 'overview') {
        const results = await Promise.allSettled([
          api.get('/performance/cycles'), api.get('/performance/rating-bands'), api.get('/performance/equivalence-settings'),
          api.get('/performance/signature-rules'), api.get('/performance/promotion-profiles'),
        ]);
        if (results.every((r) => r.status === 'rejected')) throw results[0].reason;
        commit({ overview: results.map((r) => r.status === 'fulfilled' ? responseData(r.value) : null) });
      } else if (tab === 'continuity') {
        // FIX: Don't auto-fetch the first employee's history — that causes a wasted sequential
        // API call. Just load the employee list; history is fetched lazily on employee selection.
        if (role === 'employee') {
          commit({ employees: [], history: responseData(await api.get('/performance/me/continuity')) });
        } else {
          const empData = responseData(await api.get('/employees', { params: { page: 1, pageSize: 100 } }));
          const employees = empData?.items || empData || [];
          // Intentionally NOT pre-fetching employees[0] history here.
          commit({ employees, history: null });
        }
      } else if (tab === 'tna') {
        if (role === 'employee') { const result = responseData(await api.get('/performance/me/development-signals')); commit({ items: (result.signals || []).map((item) => ({ ...item, signalCode: item.code, employee: result.employee, status: 'identified', priority: item.code === 'MISSING_REVIEW_DATA' ? 'low' : 'high', recommendedTraining: 'Review this development signal with your manager.' })) }); }
        else { const result = await api.get('/performance/training-needs', { params: { page, pageSize: 50 } }); commit({ items: responseData(result) }, responsePagination(result)); }
      } else if (tab === 'calibration' || tab === 'fairrank') {
        const cycles = responseData(await api.get('/performance/cycles'));
        const cycle = cycles.find((c) => ['active', 'in_progress'].includes(c.status)) || cycles[0];
        if (!cycle) commit({ items: [], cycles: [] });
        else commit({ items: responseData(await api.get(`/performance/cycles/${cycle.id}/${tab === 'calibration' ? 'calibration' : 'equivalence-groups'}`)), cycles, cycle });
      } else if (tab === 'goals') {
        const requests = [api.get(endpoints[tab], { params: { page, pageSize: 50 } }), api.get('/performance/cycles')];
        if (canManage) requests.push(api.get('/employees', { params: { page: 1, pageSize: 100 } }));
        const [goalsRes, cyclesRes, employeeRes] = await Promise.all(requests); const employeeData = employeeRes ? responseData(employeeRes) : [];
        commit({ items: responseData(goalsRes), cycles: responseData(cyclesRes), employees: employeeData?.items || employeeData || [] }, responsePagination(goalsRes));
      } else if (['criteria', 'evidence', 'reviews', 'readiness', 'rewards'].includes(tab)) {
        const requests = [api.get(endpoints[tab], { params: { page, pageSize: 50 } })];
        if (['evidence', 'reviews', 'readiness', 'rewards'].includes(tab)) requests.push(api.get('/performance/cycles'));
        if (['evidence', 'reviews'].includes(tab) && !canManage) requests.push(api.get('/performance/me'));
        else if (['evidence', 'reviews', 'readiness', 'rewards'].includes(tab) && canManage) requests.push(api.get('/employees', { params: { page: 1, pageSize: 100 } }));
        if (tab === 'readiness') requests.push(api.get('/performance/promotion-profiles'));
        const responses = await Promise.all(requests);
        const next = { items: responseData(responses[0]) };
        let index = 1;
        if (['evidence', 'reviews', 'readiness', 'rewards'].includes(tab)) next.cycles = responseData(responses[index++]);
        if (['evidence', 'reviews'].includes(tab) && !canManage) { const selfData = responseData(responses[index++]); next.employees = selfData?.employee ? [selfData.employee] : []; }
        else if (['evidence', 'reviews', 'readiness', 'rewards'].includes(tab) && canManage) { const employeeData = responseData(responses[index++]); next.employees = employeeData?.items || employeeData || []; }
        // Review criteria are loaded from the selected cycle's active template
        // when the Add Review form selects a cycle. Do not preload the global
        // tenant criteria list: it includes criteria from unrelated templates.
        if (tab === 'reviews') next.criteria = [];
        if (tab === 'readiness') next.profiles = responseData(responses[index++]);
        commit(next, responsePagination(responses[0]));
      } else {
        commit({ items: responseData(await api.get(endpoints[tab])) });
      }
    } catch (err) {
      if (!cached) setError(err.response?.data?.error?.message || err.response?.data?.message || `Unable to load ${tab}. Please try again.`);
    } finally {
      if (import.meta.env.DEV) console.debug(`[FairRank] ${tab} loaded in ${(performance.now() - startedAt).toFixed(0)}ms`);
      setLoading(false);
    }
  }, [page, role, tab]);

  useEffect(() => { setPage(1); }, [tab]);
  useEffect(() => { load(); }, [load]);

  // FIX: activeCycle for Overview tab — derive from data.overview[0] (the cycles array).
  // For all other tabs, fall back to data.items as before.
  const activeCycle = useMemo(() => {
    if (tab === 'overview') {
      const cycles = Array.isArray(data.overview?.[0]) ? data.overview[0] : [];
      return cycles.find((item) => item.status === 'active') || cycles[0] || null;
    }
    return (data.items || []).find((item) => item.status === 'active') || (data.items || [])[0];
  }, [tab, data]);

  const createCycle = async (event) => {
    event.preventDefault();
    setFormError('');
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    if (name.length < 3) { setFormError('Cycle name must be at least 3 characters.'); return; }
    setSaving(true);
    try {
      await api.post('/performance/cycles', { ...Object.fromEntries(form), name });
      setModal(false);
      await load({ force: true });
    } catch (err) {
      setFormError(err.response?.data?.error?.message || err.response?.data?.message || 'Unable to create the performance cycle.');
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
        {canAdmin && <Button onClick={() => { setFormError(''); setModal(true); }}><Plus size={16} /> New cycle</Button>}
      </div>

      {/* ── Grouped workflow navigation ───────────────────────────────── */}
      <nav className="perf-grouped-nav" aria-label="Performance workflow sections">
        {/* Home tab: Overview (admin/manager) or My Performance (employee) */}
        {canManage && (
          <button
            className={`perf-home-tab${tab === 'overview' ? ' active' : ''}`}
            onClick={() => setTab('overview')}
          >
            Overview
          </button>
        )}
        {role === 'employee' && (
          <button
            className={`perf-home-tab${tab === 'my' ? ' active' : ''}`}
            onClick={() => setTab('my')}
          >
            My Performance
          </button>
        )}

        {/* Workflow groups */}
        {visibleGroups.map((group, gi) => (
          <div className="perf-nav-group" key={group.label}>
            {gi === 0 && <span className="perf-nav-divider" aria-hidden="true" />}
            <span className="perf-nav-group-label">{group.label}</span>
            <div className="perf-nav-group-tabs" role="group" aria-label={group.label}>
              {group.tabs.map(([key, label]) => (
                <button
                  key={key}
                  className={tab === key ? 'active' : ''}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="perf-nav-divider" aria-hidden="true" />
          </div>
        ))}
      </nav>
      {loading ? <LoadingState label="Loading performance data..." /> : error ? <ErrorState message={error} onRetry={() => load({ force: true })} /> : (
        <section className="performance-content">
          <PageContent tab={tab} data={data} canManage={canManage} canAdmin={canAdmin} activeCycle={activeCycle} onRetry={() => load({ force: true })} onPageChange={setPage} setData={setData} />
        </section>
      )}
      {modal && (
        <div className="modal-backdrop">
          <form className="modal performance-modal" onSubmit={createCycle}>
            <button type="button" className="modal-close" onClick={() => setModal(false)}>×</button>
            <h2>Create performance cycle</h2>
            <p>Define the review period for your organization.</p>
            <label>Cycle name<input name="name" required minLength="3" maxLength="180" placeholder="2026 Annual Review" /></label>
            <label>Year<input name="year" required type="number" min="2000" max="2100" defaultValue={new Date().getFullYear()} /></label>
            <label>Cycle type<select name="cycleType" defaultValue="annual"><option value="annual">Annual</option><option value="quarterly">Quarterly</option><option value="probation">Probation</option></select></label>
            <div className="performance-form-grid">
              <label>Start date<input name="startDate" required type="date" /></label>
              <label>End date<input name="endDate" required type="date" /></label>
            </div>
            {formError && <p className="performance-form-error" role="alert">{formError}</p>}
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create cycle'} <ArrowRight size={16} /></Button>
          </form>
        </div>
      )}
    </AppShell>
  );
}

function PageContent({ tab, data, canManage, canAdmin, activeCycle, onRetry, onPageChange, setData }) {
  if (tab === 'my') return <MyPerformance data={data} />;
  if (tab === 'audit') return <AuditList items={data.items || []} />;
  if (tab === 'comparison') return <Comparison employees={data.employees || []} cycles={data.cycles || []} />;
  if (tab === 'cycles') return <CyclesWorkspace items={data.items || []} onRetry={onRetry} canAdmin={canAdmin} />;
  if (tab === 'fairrank') return <FairRankGroups items={data.items || []} cycles={data.cycles || []} cycle={data.cycle} canAdmin={canAdmin} onRetry={onRetry} />;
  if (tab === 'calibration') return <CalibrationWorkspace items={data.items || []} cycles={data.cycles || []} cycle={data.cycle} canAdmin={canAdmin} onRetry={onRetry} />;
  if (tab === 'continuity') return <ContinuityWorkspace data={data} onRetry={onRetry} setData={setData} canManage={canManage} />;
  if (tab === 'tna') return <><TnaWorkspace items={data.items || []} onRetry={onRetry} /><Pagination pagination={data.pagination} onPageChange={onPageChange} /></>;
  if (tab === 'goals') return <><div className="performance-action-bar">{canManage && <><GoalCreateButton cycles={data.cycles || []} employees={data.employees || []} onSaved={onRetry} /><GoalEditButton items={data.items || []} onSaved={onRetry} /></>}</div><GoalsWorkspace items={data.items || []} cycles={data.cycles || []} employees={data.employees || []} onRetry={onRetry} canManage={canManage} /><Pagination pagination={data.pagination} onPageChange={onPageChange} /></>;
  if (['criteria', 'evidence', 'reviews', 'readiness', 'rewards'].includes(tab)) return <><ActionWorkspace tab={tab} items={data.items || []} cycles={data.cycles || []} employees={data.employees || []} criteria={data.criteria || []} profiles={data.profiles || []} onRetry={onRetry} canManage={canManage} canAdmin={canAdmin} canSelfServe={!canManage && !canAdmin} /><Pagination pagination={data.pagination} onPageChange={onPageChange} /></>;
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
          {/* FIX: activeCycle is now correctly derived from data.overview[0] for this tab. */}
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

// ---------------------------------------------------------------------------
// FairRank tab — Equivalence Groups + Signatures + Explanations inline views
// ---------------------------------------------------------------------------
function FairRankGroups({ items, cycles, cycle, canAdmin, onRetry }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedCycleId, setSelectedCycleId] = useState(cycle?.id || '');
  const [groupItems, setGroupItems] = useState(items);
  const [action, setAction] = useState('');
  const [message, setMessage] = useState('');

  // Sub-panel: signatures and explanations
  const [sigPanel, setSigPanel] = useState(false);
  const [sigLoading, setSigLoading] = useState(false);
  const [signatures, setSignatures] = useState([]);
  const [expPanel, setExpPanel] = useState(false);
  const [expLoading, setExpLoading] = useState(false);
  const [explanations, setExplanations] = useState([]);

  useEffect(() => { setSelectedCycleId(cycle?.id || ''); setGroupItems(items); }, [cycle?.id, items]);

  async function selectCycle(event) {
    const id = event.target.value;
    setSelectedCycleId(id); setMessage('');
    setSigPanel(false); setExpPanel(false);
    if (!id) { setGroupItems([]); return; }
    setAction('load');
    try { setGroupItems(responseData(await api.get(`/performance/cycles/${id}/equivalence-groups`))); }
    catch (err) { setMessage(err.response?.data?.error?.message || 'Unable to load equivalence groups for this cycle.'); }
    finally { setAction(''); }
  }

  async function runAction(name) {
    if (!selectedCycleId) return;
    setAction(name); setMessage(''); setActionResult(null);
    try {
      const actions = {
        calculate: `/performance/cycles/${selectedCycleId}/calculate`,
        forceRecalculate: `/performance/cycles/${selectedCycleId}/calculate?force=true`,
        equivalence: `/performance/cycles/${selectedCycleId}/recalculate-equivalence`,
        signatures: `/performance/cycles/${selectedCycleId}/generate-signatures`,
        explanations: `/performance/cycles/${selectedCycleId}/generate-explanations`,
        fairness: `/performance/cycles/${selectedCycleId}/generate-fairness-flags`,
      };
      const result = responseData(await api.post(actions[name], {}));
      let nextMessage = 'FairRank data refreshed successfully.';
      let nextResult = null;
      if (name === 'calculate' || name === 'forceRecalculate') {
        const createdCount = Array.isArray(result?.created) ? result.created.length : 0;
        const skippedCount = Array.isArray(result?.skipped) ? result.skipped.length : 0;
        nextMessage = createdCount ? `Scores calculated for ${createdCount} employee${createdCount === 1 ? '' : 's'}.${skippedCount ? ` ${skippedCount} existing snapshot${skippedCount === 1 ? '' : 's'} remained unchanged.` : ''} Use Recalculate groups to update performance equivalents.` : `No new scores were created. ${skippedCount} existing snapshot${skippedCount === 1 ? '' : 's'} remained unchanged. Use Force recalculate only when deliberate recomputation is required.`;
        nextResult = { type: 'calculation', createdCount, skippedCount, forced: Boolean(result?.forced) };
      } else if (name === 'equivalence') {
        const groupCount = Number(result?.groupCount ?? 0);
        nextMessage = groupCount
          ? `${groupCount} performance-equivalent group${groupCount === 1 ? '' : 's'} rebuilt from the persisted scores.`
          : 'No performance-equivalent groups match the configured score threshold and rating-band rules.';
        nextResult = { type: 'equivalence', groupCount, snapshotCount: Number(result?.snapshotCount ?? 0) };
      } else if (name === 'signatures') {
        const generated = Number(result?.generated ?? result?.count ?? 0);
        nextMessage = `Performance signatures generated for ${generated} employee${generated === 1 ? '' : 's'}.`;
      } else if (name === 'fairness') {
        nextMessage = `Fairness review completed${result?.created != null ? `: ${result.created} flag${Number(result.created) === 1 ? '' : 's'} created` : ''}.`;
      }
      setGroupItems(responseData(await api.get(`/performance/cycles/${selectedCycleId}/equivalence-groups`)));
      await onRetry();
      setMessage(nextMessage);
      setActionResult(nextResult);
    } catch (err) {
      setMessage(err.response?.data?.error?.message || err.response?.data?.message || 'Unable to complete this FairRank action.');
    } finally { setAction(''); }
  }

  async function loadSignatures() {
    if (!selectedCycleId) return;
    setSigPanel(true); setSigLoading(true); setExpPanel(false);
    try {
      const res = await api.get('/performance/signature-rules');
      setSignatures(responseData(res));
    } catch (err) {
      setMessage(err.response?.data?.error?.message || 'Unable to load signature rules.');
    } finally { setSigLoading(false); }
  }

  async function loadExplanations() {
    if (!selectedCycleId) return;
    setExpPanel(true); setExpLoading(true); setSigPanel(false);
    try {
      const res = await api.get('/performance/fairness-flags'.replace('fairness-flags', `cycles/${selectedCycleId}/fairness-flags`));
      setExplanations(responseData(res));
    } catch (err) {
      setMessage(err.response?.data?.error?.message || 'Unable to load fairness flags.');
    } finally { setExpLoading(false); }
  }

  async function resolveFlag(flag) {
    const resolutionNote = window.prompt('Resolution note (minimum 5 characters):');
    if (!resolutionNote || resolutionNote.trim().length < 5) return;
    setAction(`resolve-${flag.id}`); setMessage('');
    try {
      await api.patch(`/performance/fairness-flags/${flag.id}`, { status: 'resolved', resolutionNote: resolutionNote.trim() });
      setExplanations(responseData(await api.get(`/performance/cycles/${selectedCycleId}/fairness-flags`)));
      setMessage('Fairness flag resolved and recorded in the audit log.');
      await onRetry();
    } catch (err) {
      setMessage(err.response?.data?.error?.message || 'Unable to resolve fairness flag.');
    } finally { setAction(''); }
  }

  return <>
    <article className="performance-card">
      <div className="performance-card-heading">
        <div><h2>Performance equivalents</h2><p>{groupItems.length ? `${groupItems.length} equivalent group${groupItems.length === 1 ? '' : 's'} found.` : 'Groups are created from calculated scores, rating bands, and the configured threshold.'}</p></div>
      </div>
      <div className="fairrank-toolbar">
        <label>Cycle<select value={selectedCycleId} onChange={selectCycle}><option value="">Select a cycle</option>{cycles.map((item) => <option value={item.id} key={item.id}>{item.name} ({item.status})</option>)}</select></label>
        {canAdmin && <div className="fairrank-actions">
          <button type="button" onClick={() => runAction('calculate')} disabled={!selectedCycleId || action}>Calculate scores</button>
          <button type="button" onClick={() => runAction('forceRecalculate')} disabled={!selectedCycleId || action} title="Force-recalculate even if snapshots already exist">Force recalculate</button>
          <button type="button" onClick={() => runAction('equivalence')} disabled={!selectedCycleId || action}>Recalculate groups</button>
          <button type="button" onClick={() => runAction('signatures')} disabled={!selectedCycleId || action}>Generate signatures</button>
          <button type="button" onClick={() => runAction('explanations')} disabled={!selectedCycleId || action}>Generate explanations</button>
          <button type="button" onClick={() => runAction('fairness')} disabled={!selectedCycleId || action}>Check fairness</button>
        </div>}
        {canAdmin && selectedCycleId && <div className="fairrank-view-actions">
          <button type="button" className={`table-link${sigPanel ? ' active' : ''}`} onClick={loadSignatures} disabled={!selectedCycleId}><Award size={14} /> View signature rules</button>
          <button type="button" className={`table-link${expPanel ? ' active' : ''}`} onClick={loadExplanations} disabled={!selectedCycleId}><Lightbulb size={14} /> View fairness flags</button>
        </div>}
      </div>
      {action && <p className="performance-inline-message">Running FairRank action…</p>}
      {message && <p className="performance-inline-message">{message}</p>}
      {actionResult?.type === 'calculation' && <p className="performance-inline-message" role="status">
        <strong>Calculation completed.</strong> {actionResult.createdCount} new snapshot{actionResult.createdCount === 1 ? '' : 's'} persisted; {actionResult.skippedCount} existing snapshot{actionResult.skippedCount === 1 ? '' : 's'} left unchanged.
      </p>}
      {actionResult?.type === 'equivalence' && <p className="performance-inline-message" role="status">
        {actionResult.groupCount} equivalent group{actionResult.groupCount === 1 ? '' : 's'} generated from {actionResult.snapshotCount} calculated snapshot{actionResult.snapshotCount === 1 ? '' : 's'}.
      </p>}
      {groupItems.length ? <div className="performance-list">{groupItems.map((group) => {
        const members = group.members || [];
        const scores = members.map((member) => Number(member.finalScore)).filter(Number.isFinite);
        const spread = scores.length ? (Math.max(...scores) - Math.min(...scores)).toFixed(2) : '—';
        return <article className="performance-list-card" key={group.id}>
          <div><strong>Equivalent group #{group.id}</strong><small>{members.length} employees · score spread {spread} points</small></div>
          <button type="button" className="status-badge info performance-info-button" onClick={() => setSelectedGroup(group)} aria-label={`View details for equivalent group ${group.id}`}>Info</button>
        </article>;
      })}</div> : <EmptyState text="No performance-equivalent groups are available for the selected cycle." />}
    </article>

    {/* Signature Rules inline panel */}
    {sigPanel && (
      <article className="performance-card">
        <div className="performance-card-heading"><div><h2><Award size={16} style={{ display: 'inline', marginRight: 6 }} />Signature Rules</h2><p>Active rules that determine each employee's performance signature label.</p></div><button className="icon-button" onClick={() => setSigPanel(false)} aria-label="Close signature panel">×</button></div>
        {sigLoading ? <LoadingState label="Loading signature rules…" /> : signatures.length ? (
          <div className="performance-list">{signatures.map((rule) => (
            <article className="performance-list-card" key={rule.id}>
              <div><strong>{rule.name}</strong><small>Categories: {Array.isArray(rule.categories) ? rule.categories.join(', ') : JSON.parse(rule.categories || '[]').join(', ')}</small></div>
              <StatusBadge status={rule.isActive ? 'Active' : 'Inactive'} />
            </article>
          ))}</div>
        ) : <EmptyState text="No signature rules are configured. Create at least one active rule before generating signatures." />}
      </article>
    )}

    {/* Fairness Flags inline panel */}
    {expPanel && (
      <article className="performance-card">
        <div className="performance-card-heading"><div><h2><Lightbulb size={16} style={{ display: 'inline', marginRight: 6 }} />Fairness Flags</h2><p>Detected fairness concerns for the selected cycle. Resolve before releasing appraisals.</p></div><button className="icon-button" onClick={() => setExpPanel(false)} aria-label="Close fairness flags panel">×</button></div>
        {expLoading ? <LoadingState label="Loading fairness flags…" /> : explanations.length ? (
          <div className="performance-list">{explanations.map((flag) => (
            <article className="performance-list-card tna-card" key={flag.id}>
              <div>
                <strong>{titleCase(flag.flagType)}</strong>
                <small>{flag.employee?.user?.name || flag.employee?.employeeCode || 'Employee'} · {flag.message}</small>
              </div>
              <div><StatusBadge status={flag.severity} /><StatusBadge status={flag.status} />{canAdmin && flag.status !== 'resolved' && <button type="button" className="table-link" onClick={() => resolveFlag(flag)} disabled={Boolean(action)}>Resolve</button>}</div>
            </article>
          ))}</div>
        ) : <EmptyState text="No fairness flags for the selected cycle. Generate flags after calculating scores." />}
      </article>
    )}

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

// ---------------------------------------------------------------------------
// Continuity — FIX: lazy-load history only on employee select, not on mount
// ---------------------------------------------------------------------------
function ContinuityWorkspace({ data, onRetry, setData, canManage }) {
  const employees = data.employees || [];
  const history = data.history;
  const [employeeId, setEmployeeId] = useState('');
  const [loadingEmployee, setLoadingEmployee] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState('');

  async function selectEmployee(event) {
    const id = event.target.value;
    setEmployeeId(id);
    if (!id) return;
    setLoadingEmployee(true); setMessage('');
    try {
      const res = await api.get(`/performance/employees/${id}/history`);
      setData((current) => ({ ...current, history: responseData(res) }));
    } catch (err) {
      setMessage(err.response?.data?.error?.message || 'Unable to load employee history.');
    } finally { setLoadingEmployee(false); }
  }

  async function analyze() {
    if (!employeeId) return;
    setAnalyzing(true); setMessage('');
    try {
      await api.post(`/performance/employees/${employeeId}/analyze-tna`, {});
      setMessage('Development signals analyzed successfully.');
    } catch (err) {
      setMessage(err.response?.data?.error?.message || 'Unable to analyze development needs.');
    } finally { setAnalyzing(false); }
  }

  return <div className="continuity-workspace">
    <article className="performance-card">
      <div className="performance-card-heading"><div><h2>Performance continuity</h2><p>Review historical ratings without fabricating missing years or detailed criterion scores.</p></div><button className="icon-button" onClick={onRetry} aria-label="Refresh continuity"><RefreshCw size={17} /></button></div>
      {canManage ? <label className="comparison-cycle">Employee<select value={employeeId} onChange={selectEmployee}><option value="">Select an employee to view continuity</option>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.user?.name || employee.employeeCode} ({employee.employeeCode})</option>)}</select></label> : <p className="performance-inline-message">Showing your permitted historical performance information.</p>}
      {message && <p className="performance-inline-message">{message}</p>}
      {loadingEmployee ? <LoadingState label="Loading employee history..." /> : history ? <>
        <div className="performance-kpis continuity-kpis"><SummaryCard label="Years reviewed" value={history.summary?.yearsReviewed ?? 0} icon={LineChart} /><SummaryCard label="Average rating" value={history.summary?.averageHistoricalRating == null ? '—' : `${history.summary.averageHistoricalRating}/5`} icon={BarChart3} tone="blue" /><SummaryCard label="Latest rating" value={history.summary?.latestRating == null ? '—' : `${history.summary.latestRating}/5`} icon={ClipboardList} tone="mint" /></div>
        <div className="continuity-timeline">{(history.timeline || []).map((row) => <div className={`continuity-year ${row.status === 'no_review_data' ? 'missing' : ''}`} key={row.year}><strong>{row.year}</strong><span>{row.originalRating == null ? 'No Review Data' : `${row.originalRating}/5`}</span><StatusBadge status={row.trend === 'insufficient_history' ? 'neutral' : row.trend} /><small>{row.changeFromPreviousYear == null ? 'Baseline / insufficient history' : `${row.changeFromPreviousYear > 0 ? '+' : ''}${row.changeFromPreviousYear} from previous year`}</small></div>)}</div>
        <div className="continuity-summary"><span>Best: {history.summary?.bestRating ?? '—'}/5</span><span>Worst: {history.summary?.worstRating ?? '—'}/5</span><span>Volatility: {history.summary?.ratingVolatility ?? '—'}</span><span>Missing years: {history.summary?.missingReviewYears?.length ? history.summary.missingReviewYears.join(', ') : 'None'}</span></div>
        {canManage && <Button onClick={analyze} disabled={analyzing || !employeeId}>{analyzing ? 'Analyzing...' : 'Analyze TNA'} <ArrowRight size={16} /></Button>}
      </> : <EmptyState text={canManage ? (employees.length ? 'Select an employee to view historical continuity.' : 'No employees are available.') : 'Loading your continuity data…'} />}
    </article>
  </div>;
}

function CyclesWorkspace({ items, onRetry, canAdmin }) {
  const transitions = { draft: ['active', 'Activate'], active: ['review', 'Open review'], review: ['calibration', 'Start calibration'], calibration: ['completed', 'Complete cycle'] };
  const [message, setMessage] = useState('');
  async function transition(cycle) { const [status, label] = transitions[cycle.status] || []; if (!status || !window.confirm(`${label} ${cycle.name}?`)) return; try { await api.patch(`/performance/cycles/${cycle.id}`, { status }); setMessage(`Cycle ${status} successfully.`); await onRetry(); } catch (err) { setMessage(err.response?.data?.error?.message || 'Unable to update cycle status.'); } }
  return <article className="performance-card"><div className="performance-card-heading"><div><h2>Cycles</h2><p>Create cycles, activate them, collect reviews, calibrate, and complete the workflow.</p></div></div>{message && <p className="performance-inline-message">{message}</p>}{items.length ? <div className="performance-list">{items.map((cycle) => <article className="performance-list-card" key={cycle.id}><div><strong>{cycle.name}</strong><small>{cycle.year} · {titleCase(cycle.cycleType)} · {cycle.startDate} → {cycle.endDate}</small></div><div><StatusBadge status={cycle.status} />{canAdmin && transitions[cycle.status] && <button className="table-link" onClick={() => transition(cycle)}>{transitions[cycle.status][1]}</button>}</div></article>)}</div> : <EmptyState text="No performance cycles are available. Use New cycle to begin." />}</article>;
}

function CalibrationWorkspace({ items, cycles, cycle, canAdmin, onRetry }) {
  const [cycleId, setCycleId] = useState(cycle?.id || cycles[0]?.id || ''); const [message, setMessage] = useState('');
  const asRows = (value) => Array.isArray(value) ? value : value ? [value] : [];
  const [rows, setRows] = useState(asRows(items));
  useEffect(() => { setRows(asRows(items)); }, [items]);
  async function selectCycle(event) { const id = event.target.value; setCycleId(id); if (!id) { setRows([]); return; } try { setRows(asRows(responseData(await api.get(`/performance/cycles/${id}/calibration`)))); } catch (err) { setMessage(err.response?.data?.error?.message || 'Unable to load calibration reviews.'); } }
  async function decide(reviewId, action) { const justification = action === 'request_clarification' ? window.prompt('Explain what needs clarification:') : null; if (action === 'request_clarification' && !justification) return; try { await api.post(`/performance/reviews/${reviewId}/calibrate`, { action, justification }); setMessage('Calibration decision saved.'); await onRetry(); } catch (err) { setMessage(err.response?.data?.error?.message || 'Unable to save calibration decision.'); } }
  return <article className="performance-card"><div className="performance-card-heading"><div><h2>Calibration</h2><p>Review submitted appraisals before FairRank calculation and release.</p></div></div><label className="comparison-cycle">Cycle<select value={cycleId} onChange={selectCycle}><option value="">Select cycle</option>{cycles.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>{message && <p className="performance-inline-message">{message}</p>}{rows.length ? <div className="performance-list">{rows.map((item) => { const review = item.review || item; const decisionStatus = item.calibrationDecision?.status; const isConfirmed = decisionStatus === 'confirmed'; const displayStatus = isConfirmed ? 'confirmed' : decisionStatus === 'clarification_requested' ? 'clarification requested' : review.status; const score = review.overallScore ?? item.scoreSnapshot?.finalScore; return <article className="performance-list-card" key={review.id}><div><strong>{review.employee?.user?.name || `Review #${review.id}`}</strong><small>{titleCase(review.reviewType)} · score {score ?? 'Pending FairRank calculation'} · {titleCase(displayStatus)}</small></div><div><StatusBadge status={displayStatus} />{canAdmin && !isConfirmed && ['submitted', 'in_progress'].includes(review.status) && <><button className="table-link" onClick={() => decide(review.id, 'confirm')}>Confirm</button><button className="table-link" onClick={() => decide(review.id, 'request_clarification')}>Clarify</button></>}</div></article>; })}</div> : <EmptyState text="No submitted reviews are available for calibration." />}</article>;
}

function ActionWorkspace({ tab, items, cycles, employees, criteria, profiles, onRetry, canManage, canAdmin, canSelfServe }) {
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [profileId, setProfileId] = useState('');
  const [readinessRows, setReadinessRows] = useState([]);
  const [editId, setEditId] = useState('');
  const [reviewCriteria, setReviewCriteria] = useState(criteria);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const selectedProfile = profiles.find((profile) => String(profile.id) === String(profileId));
  const title = { criteria: 'Criteria', evidence: 'Evidence', reviews: 'Reviews', readiness: 'Readiness', rewards: 'Rewards' }[tab];
  const actionLabel = { criteria: 'criterion', evidence: 'evidence', reviews: 'review', readiness: 'assessment', rewards: 'reward' }[tab];
  const canCreate = tab === 'criteria' ? canAdmin : (['evidence', 'reviews'].includes(tab) ? (canManage || canSelfServe) : canManage);
  async function viewReadiness(employeeId) { try { setReadinessRows(responseData(await api.get(`/performance/employees/${employeeId}/promotion-readiness`))); } catch (err) { setMessage(err.response?.data?.error?.message || 'Unable to load promotion readiness.'); } }
  async function loadReviewCriteria(cycleId) {
    setReviewCriteria([]);
    if (!cycleId || !['reviews', 'evidence'].includes(tab)) return;
    setCriteriaLoading(true); setFormError('');
    try { setReviewCriteria(responseData(await api.get(`/performance/cycles/${cycleId}/review-criteria`))); }
    catch (err) { setFormError(err.response?.data?.error?.message || 'Unable to load criteria for this cycle.'); }
    finally { setCriteriaLoading(false); }
  }
  async function editRecord() { const item = items.find((row) => String(row.id) === String(editId)); if (!item) return; const value = window.prompt(tab === 'criteria' ? 'Criterion name:' : 'Goal progress (0-100):', tab === 'criteria' ? item.name : item.progressPercentage); if (value === null) return; try { const payload = tab === 'criteria' ? { name: value.trim() } : { progressPercentage: Number(value) }; await api.patch(`/performance/${tab}/${item.id}`, payload); setMessage(`${title} updated successfully.`); await onRetry(); } catch (err) { setMessage(err.response?.data?.error?.message || `Unable to update ${title.toLowerCase()}.`); } }

  async function submit(event) {
    event.preventDefault(); setSaving(true); setFormError('');
    const form = new FormData(event.currentTarget); const raw = Object.fromEntries(form.entries());
    try {
      let payload = raw; let route = `/performance/${tab}`;
      if (tab === 'criteria') payload = { ...raw, weight: Number(raw.weight || 0), ratingScaleMin: Number(raw.ratingScaleMin || 0), ratingScaleMax: Number(raw.ratingScaleMax || 5), evidenceRequired: raw.evidenceRequired === 'on' };
      if (tab === 'evidence') payload = { ...raw, cycleId: Number(raw.cycleId), employeeId: Number(raw.employeeId), criterionId: raw.criterionId ? Number(raw.criterionId) : null, eventDate: raw.eventDate, sourceType: raw.sourceType || 'manual' };
      if (tab === 'reviews') {
        payload = { cycleId: Number(raw.cycleId), employeeId: Number(raw.employeeId), reviewType: raw.reviewType, strengths: raw.strengths || null, improvementAreas: raw.improvementAreas || null, comments: raw.comments || null, scores: reviewCriteria.map((criterion) => ({ criterionId: Number(criterion.id), rawScore: Number(raw[`score_${criterion.id}`]) })).filter((score) => Number.isFinite(score.rawScore)) };
      }
      if (tab === 'readiness') {
        payload = { cycleId: Number(raw.cycleId), employeeId: Number(raw.employeeId), promotionProfileId: Number(raw.promotionProfileId), comments: raw.comments || null, scores: (selectedProfile?.criteria || []).map((criterion) => ({ criterionId: Number(criterion.id), score: Number(raw[`promotion_${criterion.id}`]) })).filter((score) => Number.isFinite(score.score)) };
        route = '/performance/promotion-assessments';
      }
      if (tab === 'rewards') payload = { cycleId: Number(raw.cycleId), employeeId: Number(raw.employeeId), rewardType: raw.rewardType, recommendedValue: Number(raw.recommendedValue), reason: raw.reason };
      if (tab === 'reviews' && !payload.scores.length) throw new Error('Enter at least one criterion score.');
      if (tab === 'readiness' && !payload.scores.length) throw new Error('Enter at least one readiness score.');
      await api.post(route, payload); setModal(false); setProfileId(''); setMessage(`${title} record saved successfully.`); await onRetry();
    } catch (err) {
      const apiError = err.response?.data?.error;
      const fields = apiError?.fields;
      const fieldMessage = fields ? Object.entries(fields).flatMap(([field, messages]) => (Array.isArray(messages) ? messages : [messages]).filter(Boolean).map((message) => `${titleCase(field)}: ${message}`)).join(' ') : '';
      setFormError([apiError?.message || err.message || `Unable to save ${title.toLowerCase()}.`, fieldMessage].filter(Boolean).join(' '));
    }
    finally { setSaving(false); }
  }

  async function reviewReward(id, action) {
    const reason = action === 'reject' ? window.prompt('Reason for rejecting this reward:') : null;
    if (action === 'reject' && !reason) return;
    try { await api.post(`/performance/rewards/${id}/${action}`, action === 'reject' ? { reason } : {}); setMessage(`Reward ${action}d successfully.`); await onRetry(); }
    catch (err) { setMessage(err.response?.data?.error?.message || 'Unable to update reward status.'); }
  }

  return <article className="performance-card">
    <div className="performance-card-heading"><div><h2>{title}</h2><p>{tab === 'criteria' ? 'Define the criteria used by review templates.' : `Manage ${title.toLowerCase()} using saved tenant-scoped records.`}</p></div>{canCreate && <Button size="sm" onClick={() => { setFormError(''); setModal(true); }}> <Plus size={15} /> Add {actionLabel}</Button>}</div>
    {message && <p className="performance-inline-message" role="status">{message}</p>}
    {['criteria', 'goals'].includes(tab) && canManage && <div className="performance-action-bar"><select value={editId} onChange={(event) => setEditId(event.target.value)}><option value="">Select record to edit</option>{items.map((item) => <option value={item.id} key={item.id}>{item.name || item.title}</option>)}</select><button className="table-link" disabled={!editId} onClick={editRecord}>Edit selected</button></div>}
    {tab === 'readiness' && canManage && <div className="performance-list"><h3>Employee readiness results</h3>{employees.map((employee) => <button className="table-link" key={employee.id} onClick={() => viewReadiness(employee.id)}>{employee.user?.name || employee.employeeCode}</button>)}{readinessRows.map((row) => <div className="performance-list-card" key={row.id}><strong>{row.profile?.name || 'Assessment'}</strong><span>{row.readinessScore}% · {titleCase(row.recommendation)}</span></div>)}</div>}
    {items.length ? <div className="performance-list">{items.map((item) => <article className="performance-list-card" key={item.id || item.name}>
      <div><strong>{item.name || item.title || item.employee?.user?.name || item.employee?.employeeCode || `Record #${item.id}`}</strong><small>{item.description || item.reason || item.status || item.category || item.targetRole || ''}</small></div>
      <div className="performance-row-actions"><StatusBadge status={titleCase(item.status || item.verificationStatus || 'recorded')} />{tab === 'reviews' && item.status === 'draft' && <button className="table-link" onClick={async () => { try { await api.post(`/performance/reviews/${item.id}/submit`); await onRetry(); } catch (err) { setMessage(err.response?.data?.error?.message || 'Unable to submit review.'); } }}>Submit</button>}{tab === 'evidence' && canManage && item.verificationStatus === 'pending' && <button className="table-link" onClick={async () => { try { await api.patch(`/performance/evidence/${item.id}/verify`, { verificationStatus: 'verified' }); await onRetry(); } catch (err) { setMessage(err.response?.data?.error?.message || 'Unable to verify evidence.'); } }}>Verify</button>}{tab === 'rewards' && canAdmin && item.status === 'recommended' && <><button className="table-link" onClick={() => reviewReward(item.id, 'approve')}>Approve</button><button className="table-link danger" onClick={() => reviewReward(item.id, 'reject')}>Reject</button></>}</div>
    </article>)}</div> : <EmptyState text={`No ${title.toLowerCase()} records are available yet.`} />}
    {modal && <div className="modal-backdrop"><form className="modal performance-modal" onSubmit={submit}><button type="button" className="modal-close" onClick={() => setModal(false)}>×</button><h2>Add {title.slice(0, -1)}</h2><p>Save this step to continue the FairRank workflow.</p>
      {tab === 'criteria' && <><label>Name<input name="name" required minLength="2" /></label><label>Category<input name="category" required minLength="2" /></label><label>Weight (%)<input name="weight" type="number" min="0" max="100" defaultValue="0" /></label><label>Description<textarea name="description" /></label><label>Rating max<input name="ratingScaleMax" type="number" min="1" max="100" defaultValue="5" /></label><label><input name="evidenceRequired" type="checkbox" defaultChecked /> Evidence required</label></>}
      {tab === 'evidence' && <><RecordSelectors cycles={cycles} employees={employees} onCycleChange={loadReviewCriteria} /><label>Criterion<select name="criterionId" required><option value="">Select criterion</option>{reviewCriteria.map((criterion) => <option value={criterion.id} key={criterion.id}>{criterion.name}</option>)}</select></label><label>Evidence type<select name="evidenceType" defaultValue="manager_observation"><option value="kpi_result">KPI result</option><option value="project_completion">Project completion</option><option value="manager_observation">Manager observation</option><option value="training_completion">Training completion</option><option value="quality_metric">Quality metric</option></select></label><label>Title<input name="title" required minLength="3" /></label><label>Event date<input name="eventDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label><label>Description<textarea name="description" /></label></>}
      {tab === 'reviews' && <><RecordSelectors cycles={cycles} employees={employees} onCycleChange={loadReviewCriteria} /><label>Review type<select name="reviewType" defaultValue={canManage ? 'manager' : 'self'}><option value="self">Self</option>{canManage && <option value="manager">Manager</option>}</select></label><fieldset><legend>Criterion scores (0–100)</legend>{criteriaLoading ? <p className="performance-inline-message">Loading criteria for this cycle…</p> : reviewCriteria.length ? reviewCriteria.map((criterion) => <label key={criterion.id}>{criterion.name}<input name={`score_${criterion.id}`} type="number" min="0" max="100" /></label>) : <p className="performance-inline-message">Select a cycle to load its template criteria.</p>}</fieldset><label>Comments<textarea name="comments" /></label></>}
      {tab === 'readiness' && <><RecordSelectors cycles={cycles} employees={employees} /><label>Promotion profile<select name="promotionProfileId" required value={profileId} onChange={(event) => setProfileId(event.target.value)}><option value="">Select profile</option>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.name} → {profile.targetRole}</option>)}</select></label>{selectedProfile?.criteria?.map((criterion) => <label key={criterion.id}>{criterion.criterionName}<input name={`promotion_${criterion.id}`} type="number" min="0" max="100" /></label>)}<label>Comments<textarea name="comments" /></label></>}
      {tab === 'rewards' && <><RecordSelectors cycles={cycles} employees={employees} /><label>Reward type<select name="rewardType" defaultValue="recognition"><option value="salary_increment">Salary increment</option><option value="performance_bonus">Performance bonus</option><option value="promotion">Promotion</option><option value="recognition">Recognition</option><option value="development_opportunity">Development opportunity</option></select></label><label>Recommended value<input name="recommendedValue" type="number" min="0" defaultValue="0" /></label><label>Reason<textarea name="reason" required minLength="5" /></label></>}
      {formError && <p className="performance-form-error" role="alert">{formError}</p>}<Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save record'} <ArrowRight size={16} /></Button>
    </form></div>}
  </article>;
}

function RecordSelectors({ cycles, employees, onCycleChange }) { return <><label>Performance cycle<select name="cycleId" required onChange={(event) => onCycleChange?.(event.target.value)}><option value="">Select cycle</option>{cycles.map((cycle) => <option value={cycle.id} key={cycle.id}>{cycle.name}</option>)}</select></label><label>Employee<select name="employeeId" required><option value="">Select employee</option>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.user?.name || employee.employeeCode} ({employee.employeeCode})</option>)}</select></label></>; }

function TnaWorkspace({ items, onRetry }) {
  const [priority, setPriority] = useState(''); const [status, setStatus] = useState(''); const [signal, setSignal] = useState(''); const filtered = items.filter((item) => (!priority || item.priority === priority) && (!status || item.status === status) && (!signal || item.signalCode === signal));
  return <article className="performance-card"><div className="performance-card-heading"><div><h2>Training Needs Analysis</h2><p>Deterministic development signals from historical performance continuity.</p></div><button className="icon-button" onClick={onRetry} aria-label="Refresh training needs"><RefreshCw size={17} /></button></div><div className="tna-filters"><select value={priority} onChange={(e) => setPriority(e.target.value)}><option value="">All priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="identified">Identified</option><option value="reviewed">Reviewed</option><option value="planned">Planned</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select><select value={signal} onChange={(e) => setSignal(e.target.value)}><option value="">All signals</option>{[...new Set(items.map((item) => item.signalCode).filter(Boolean))].map((value) => <option value={value} key={value}>{titleCase(value)}</option>)}</select></div>{filtered.length ? <div className="performance-list">{filtered.map((item) => <article className="performance-list-card tna-card" key={item.id}><div><strong>{item.employee?.user?.name || item.employee?.employeeCode || 'Employee'}</strong><small>{titleCase(item.signalCode || 'MANUAL')} · {item.reason}</small><small>Recommended: {item.recommendedTraining || 'Review with manager'}</small></div><div><StatusBadge status={item.priority} /><StatusBadge status={item.status} /></div></article>)}</div> : <EmptyState text="No training needs match the selected filters." />}</article>;
}

function GoalsWorkspace({ items, cycles, employees, onRetry, canManage }) {
  const [targetCycles, setTargetCycles] = useState({}); const [message, setMessage] = useState(''); const incomplete = items.filter((item) => !['completed', 'cancelled'].includes(item.status) && Number(item.progressPercentage || 0) < 100);
  async function carryForward(goal) { const targetCycleId = targetCycles[goal.id]; if (!targetCycleId) return; setMessage(''); try { await api.post(`/performance/goals/${goal.id}/carry-forward`, { targetCycleId: Number(targetCycleId) }); setMessage('Goal carried forward successfully.'); onRetry(); } catch (err) { setMessage(err.response?.data?.error?.message || 'Unable to carry forward this goal.'); } }
  return <article className="performance-card"><div className="performance-card-heading"><div><h2>Goals and continuity</h2><p>Completed goals remain historical. Only incomplete goals can be explicitly carried forward.</p></div><button className="icon-button" onClick={onRetry} aria-label="Refresh goals"><RefreshCw size={17} /></button></div>{message && <p className="performance-inline-message">{message}</p>}{items.length ? <div className="performance-list">{items.map((goal) => <article className="performance-list-card goal-continuity-card" key={goal.id}><div><strong>{goal.title}</strong><small>{goal.cycle?.name || 'Performance cycle'} · {titleCase(goal.status)} · {Number(goal.progressPercentage || 0)}% complete</small><small>Continuity: {titleCase(goal.continuityStatus || 'not_applicable')}</small></div>{canManage && incomplete.some((item) => item.id === goal.id) && <div className="goal-carry-forward"><select value={targetCycles[goal.id] || ''} onChange={(event) => setTargetCycles((current) => ({ ...current, [goal.id]: event.target.value }))}><option value="">Carry to cycle...</option>{cycles.filter((cycle) => cycle.id !== goal.cycleId && !['completed', 'archived'].includes(cycle.status)).map((cycle) => <option value={cycle.id} key={cycle.id}>{cycle.name}</option>)}</select><button className="table-link" disabled={!targetCycles[goal.id]} onClick={() => carryForward(goal)}>Carry forward</button></div>}</article>)}</div> : <EmptyState text="No performance goals are available." />}</article>;
}

function GoalCreateButton({ cycles, employees, onSaved }) {
  const [open, setOpen] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  async function submit(event) { event.preventDefault(); setSaving(true); setError(''); try { const raw = Object.fromEntries(new FormData(event.currentTarget)); await api.post('/performance/goals', { ...raw, cycleId: Number(raw.cycleId), employeeId: Number(raw.employeeId), weight: Number(raw.weight || 0), progressPercentage: 0, status: 'not_started' }); setOpen(false); onSaved(); } catch (err) { setError(err.response?.data?.error?.message || 'Unable to create goal.'); } finally { setSaving(false); } }
  return <>{<Button size="sm" onClick={() => setOpen(true)}><Plus size={15} /> Add goal</Button>}{open && <div className="modal-backdrop"><form className="modal performance-modal" onSubmit={submit}><button type="button" className="modal-close" onClick={() => setOpen(false)}>×</button><h2>Add goal</h2><label>Cycle<select name="cycleId" required><option value="">Select cycle</option>{cycles.map((cycle) => <option value={cycle.id} key={cycle.id}>{cycle.name}</option>)}</select></label><label>Employee<select name="employeeId" required><option value="">Select employee</option>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.user?.name || employee.employeeCode}</option>)}</select></label><label>Title<input name="title" required minLength="3" /></label><label>Goal type<select name="goalType" defaultValue="kpi"><option value="kpi">KPI</option><option value="objective">Objective</option><option value="development">Development</option><option value="project">Project</option></select></label><label>Weight (%)<input name="weight" type="number" min="0" max="100" defaultValue="0" /></label>{error && <p className="performance-form-error" role="alert">{error}</p>}<Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create goal'}</Button></form></div>}</>;
}

function GoalEditButton({ items, onSaved }) {
  const [goalId, setGoalId] = useState('');
  const [saving, setSaving] = useState(false);
  async function editGoal() {
    const goal = items.find((item) => String(item.id) === String(goalId));
    if (!goal) return;
    const value = window.prompt('Goal progress (0-100):', String(goal.progressPercentage ?? 0));
    if (value === null) return;
    const progressPercentage = Number(value);
    if (!Number.isFinite(progressPercentage) || progressPercentage < 0 || progressPercentage > 100) return;
    setSaving(true);
    try {
      await api.patch(`/performance/goals/${goal.id}`, { progressPercentage });
      await onSaved();
      setGoalId('');
    } finally {
      setSaving(false);
    }
  }
  return <div className="performance-action-bar">
    <select aria-label="Select goal to edit" value={goalId} onChange={(event) => setGoalId(event.target.value)}>
      <option value="">Select goal to edit</option>
      {items.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}
    </select>
    <button type="button" className="table-link" disabled={!goalId || saving} onClick={editGoal}>{saving ? 'Saving...' : 'Edit selected'}</button>
  </div>;
}

function EmptyState({ text }) { return <div className="performance-empty"><CircleAlert size={22} /><p>{text}</p></div>; }

function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return <div className="performance-pagination"><span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} records</span><div><button type="button" className="table-link" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>Previous</button><button type="button" className="table-link" disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>Next</button></div></div>;
}

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
