import { Op } from 'sequelize';
import { Employee, EmployeeHistoryEvent, HistoricalPerformanceRecord, PerformanceCycle, PerformanceCycleLink, PerformanceGoal, User } from '../../database/models/index.js';
import { AppError } from '../../middleware/error.js';

function maxConsecutive(values, predicate) { let current = 0; let maximum = 0; for (const value of values) { if (predicate(value)) { current += 1; maximum = Math.max(maximum, current); } else current = 0; } return maximum; }
function volatility(values) { if (values.length < 2) return 0; const mean = values.reduce((sum, value) => sum + value, 0) / values.length; return Math.sqrt(values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length); }

async function employeeFor(auth, employeeId) {
  const employee = await Employee.findOne({ where: { id: employeeId, tenantId: auth.tenantId }, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] });
  if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  if (auth.role === 'employee' && employee.userId !== auth.userId) throw new AppError('You may only access your own performance history', 403, 'CONTINUITY_ACCESS_DENIED');
  if (auth.role === 'manager') {
    const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] });
    if (!manager?.departmentId || manager.departmentId !== employee.departmentId) throw new AppError('Managers may only access history for their department', 403, 'CONTINUITY_ACCESS_DENIED');
  }
  return employee;
}

export function trendFor(current, previous) { if (previous == null) return 'insufficient_history'; if (current > previous) return 'improved'; if (current < previous) return 'declined'; return 'stable'; }

export function buildTimeline(records, fromYear, toYear) {
  const sorted = records.slice().sort((a, b) => a.year - b.year || a.id - b.id); const byYear = new Map(); sorted.forEach(row => byYear.set(row.year, row));
  const start = fromYear ?? sorted[0]?.year; const end = toYear ?? sorted[sorted.length - 1]?.year; if (start == null || end == null) return [];
  const result = []; let previousRating = null;
  for (let year = start; year <= end; year += 1) { const row = byYear.get(year); if (!row) { result.push({ year, status: 'no_review_data', originalRating: null, normalizedScore: null, changeFromPreviousYear: null, trend: 'insufficient_history' }); previousRating = null; continue; } const rating = Number(row.sourceRating); result.push({ id: row.id, year, cycleId: row.cycleId, performanceDate: row.performanceDate, originalRating: rating, normalizedScore: Number(row.normalizedScore), status: 'reviewed', changeFromPreviousYear: previousRating == null ? null : Number((rating - previousRating).toFixed(2)), trend: trendFor(rating, previousRating), source: row.source }); previousRating = rating; }
  return result;
}

export async function getEmployeeContinuity(auth, employeeId, query = {}) {
  const employee = await employeeFor(auth, employeeId); const where = { tenantId: auth.tenantId, employeeId };
  if (query.fromYear) where['$cycle.year$'] = { [Op.gte]: query.fromYear }; if (query.toYear) where['$cycle.year$'] = { ...(where['$cycle.year$'] || {}), [Op.lte]: query.toYear };
  const records = await HistoricalPerformanceRecord.findAll({ where, include: [{ model: PerformanceCycle, as: 'cycle', attributes: ['id', 'name', 'year', 'status'] }], order: [[{ model: PerformanceCycle, as: 'cycle' }, 'year', 'ASC'], ['id', 'ASC']] });
  const serialized = records.map(row => ({ ...row.toJSON(), year: row.cycle?.year, originalRating: Number(row.sourceRating), normalizedScore: Number(row.normalizedScore) }));
  const timeline = buildTimeline(serialized, query.fromYear, query.toYear); const ratings = serialized.map(row => row.originalRating); const latest = timeline.filter(row => row.status === 'reviewed').at(-1); const reviewed = timeline.filter(row => row.status === 'reviewed'); const previous = reviewed.at(-2);
  const transitions = timeline.map((row, index) => { const previousRow = timeline[index - 1]; return { improved: row.status === 'reviewed' && previousRow?.status === 'reviewed' && row.originalRating > previousRow.originalRating, declined: row.status === 'reviewed' && previousRow?.status === 'reviewed' && row.originalRating < previousRow.originalRating }; });
  return { employee: { id: employee.id, employeeCode: employee.employeeCode, name: employee.user?.name || null, departmentId: employee.departmentId, designation: employee.designation }, timeline, summary: { yearsReviewed: reviewed.length, averageHistoricalRating: ratings.length ? Number((ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(2)) : null, latestRating: latest?.originalRating ?? null, previousRating: previous?.originalRating ?? null, bestRating: ratings.length ? Math.max(...ratings) : null, worstRating: ratings.length ? Math.min(...ratings) : null, consecutiveImprovementYears: maxConsecutive(transitions, value => value.improved), consecutiveDeclineYears: maxConsecutive(transitions, value => value.declined), ratingVolatility: Number(volatility(ratings).toFixed(2)), missingReviewYears: timeline.filter(row => row.status === 'no_review_data').map(row => row.year) } };
}

export async function getEmployeeHistory(auth, employeeId, query = {}) {
  const continuity = await getEmployeeContinuity(auth, employeeId, query); const events = await EmployeeHistoryEvent.findAll({ where: { tenantId: auth.tenantId, employeeId }, order: [['effective_date', 'ASC'], ['id', 'ASC']] });
  return { ...continuity, actions: events.map(event => event.toJSON()) };
}

export async function getCycleContinuitySummary(auth, cycleId) {
  const cycle = await PerformanceCycle.findOne({ where: { id: cycleId, tenantId: auth.tenantId } }); if (!cycle) throw new AppError('Performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
  const link = await PerformanceCycleLink.findOne({ where: { tenantId: auth.tenantId, currentCycleId: cycleId }, include: [{ model: PerformanceCycle, as: 'previousCycle', attributes: ['id', 'name', 'year', 'status'] }] });
  const records = await HistoricalPerformanceRecord.findAll({ where: { tenantId: auth.tenantId, cycleId }, include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeCode'], include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] }] });
  return { cycle: cycle.toJSON(), previousCycle: link?.previousCycle || null, employeesReviewed: records.length, records: records.map(row => ({ employeeId: row.employeeId, employeeCode: row.employee?.employeeCode, employeeName: row.employee?.user?.name, rating: Number(row.sourceRating), normalizedScore: Number(row.normalizedScore) })) };
}

export async function listCycleLinks(auth) { return PerformanceCycleLink.findAll({ where: { tenantId: auth.tenantId }, include: [{ model: PerformanceCycle, as: 'previousCycle', attributes: ['id', 'name', 'year', 'status'] }, { model: PerformanceCycle, as: 'currentCycle', attributes: ['id', 'name', 'year', 'status'] }], order: [[{ model: PerformanceCycle, as: 'currentCycle' }, 'year', 'ASC']] }); }
