import { Op } from 'sequelize';
import { Employee, PerformanceCycle, PerformanceGoal, TrainingNeed, User } from '../../database/models/index.js';
import { AppError } from '../../middleware/error.js';
import { getEmployeeContinuity } from './continuity.service.js';
import { sequelize } from '../../config/database.js';

const SIGNAL_SOURCE = 'historical_continuity';
const signalInclude = [{ model: Employee, as: 'employee', attributes: ['id', 'employeeCode', 'departmentId'], include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] }, { model: PerformanceCycle, as: 'cycle', attributes: ['id', 'name', 'year', 'status'] }, { model: PerformanceCycle, as: 'sourceCycle', attributes: ['id', 'name', 'year', 'status'] }];

async function employeeFor(auth, employeeId) {
  const employee = await Employee.findOne({ where: { id: employeeId, tenantId: auth.tenantId }, include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] });
  if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  if (auth.role === 'employee' && employee.userId !== auth.userId) throw new AppError('You may only access your own development information', 403, 'TNA_ACCESS_DENIED');
  if (auth.role === 'manager') { const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] }); if (!manager?.departmentId || manager.departmentId !== employee.departmentId) throw new AppError('Managers may only access development information for their department', 403, 'TNA_ACCESS_DENIED'); }
  return employee;
}

function priorityFor(code, magnitude = 0) { if (code === 'SUSTAINED_LOW_PERFORMANCE' || code === 'SIGNIFICANT_PERFORMANCE_DECLINE') return 'high'; if (code === 'PERFORMANCE_DECLINE' && magnitude >= 1) return 'high'; if (code === 'MISSING_REVIEW_DATA') return 'low'; return 'medium'; }
function recommendationFor(code) { if (code === 'MISSING_REVIEW_DATA') return 'Review the missing annual performance record and correct the workflow or source data.'; return 'Review the historical performance pattern with the employee and agree on a documented development action.'; }
function riskLevel(score) { return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'; }

export function signalsFromTimeline(timeline, lowThreshold = 2) {
  const signals = []; let lowRun = [];
  for (let index = 0; index < timeline.length; index += 1) {
    const row = timeline[index];
    if (row.status === 'reviewed' && row.originalRating <= lowThreshold) lowRun.push(row); else lowRun = [];
    if (lowRun.length >= 2 && lowRun.at(-1).year - lowRun.at(-2).year === 1) signals.push({ code: 'SUSTAINED_LOW_PERFORMANCE', year: row.year, sourceReferenceId: String(row.cycleId), reason: `Rating remained at or below ${lowThreshold}/5 for consecutive reviewed years ending ${row.year}.`, magnitude: lowThreshold });
    if (row.status === 'reviewed' && row.trend === 'declined' && row.changeFromPreviousYear != null) { const magnitude = Math.abs(row.changeFromPreviousYear); signals.push({ code: magnitude >= 2 ? 'SIGNIFICANT_PERFORMANCE_DECLINE' : 'PERFORMANCE_DECLINE', year: row.year, sourceReferenceId: String(row.cycleId), reason: `Rating declined by ${magnitude} point(s) from the previous reviewed year.`, magnitude }); }
    if (row.status === 'no_review_data') signals.push({ code: 'MISSING_REVIEW_DATA', year: row.year, sourceReferenceId: String(row.year), reason: `No annual performance record is available for ${row.year}.`, magnitude: 0 });
  }
  return [...new Map(signals.map(signal => [`${signal.code}:${signal.year}`, signal])).values()];
}

async function gapFor(auth, employee, continuity) {
  const applicable = []; const factors = [];
  const timeline = continuity.timeline;
  if (continuity.summary.consecutiveImprovementYears >= 0 && timeline.some(row => row.trend === 'declined')) { applicable.push(25); factors.push({ code: 'PERFORMANCE_DECLINE', weight: 25, reason: 'Historical rating decline detected.' }); }
  if (timeline.some(row => row.status === 'reviewed' && row.originalRating <= 2)) { applicable.push(35); factors.push({ code: 'REPEATED_LOW_PERFORMANCE', weight: 35, reason: 'At least one low historical rating is present.' }); }
  const unfinished = await PerformanceGoal.count({ where: { tenantId: auth.tenantId, employeeId: employee.id, status: { [Op.in]: ['not_started', 'in_progress', 'partially_completed'] } } });
  if (unfinished > 0) { applicable.push(20); factors.push({ code: 'UNFINISHED_GOALS', weight: 20, reason: `${unfinished} unfinished goal(s) remain.` }); }
  const outstanding = await TrainingNeed.count({ where: { tenantId: auth.tenantId, employeeId: employee.id, status: { [Op.in]: ['identified', 'reviewed', 'approved', 'planned', 'in_progress'] }, sourceType: { [Op.ne]: SIGNAL_SOURCE } } });
  if (outstanding > 0) { applicable.push(10); factors.push({ code: 'OUTSTANDING_DEVELOPMENT', weight: 10, reason: `${outstanding} outstanding development need(s) remain.` }); }
  const total = applicable.reduce((sum, value) => sum + value, 0); const score = total ? Number((factors.reduce((sum, factor) => sum + factor.weight, 0) / total * 100).toFixed(2)) : 0;
  return { score, riskLevel: riskLevel(score), contributingFactors: factors };
}

async function buildEmployeeTna(auth, employeeId, input = {}) {
  const employee = await employeeFor(auth, employeeId); const continuity = await getEmployeeContinuity(auth, employeeId, { fromYear: input.fromYear, toYear: input.toYear }); const signals = signalsFromTimeline(continuity.timeline, input.lowRatingThreshold ?? 2); const gap = await gapFor(auth, employee, continuity); const currentCycle = await PerformanceCycle.findOne({ where: { tenantId: auth.tenantId, year: input.toYear || continuity.timeline.at(-1)?.year }, order: [['year', 'DESC']] });
  return { employee, continuity, signals, gap, currentCycle };
}

export async function getEmployeeTna(auth, employeeId, input = {}) {
  const result = await buildEmployeeTna(auth, employeeId, input);
  return { employee: result.continuity.employee, summary: result.continuity.summary, signals: result.signals, continuityGap: result.gap };
}

export async function getMyEmployeeTna(auth, input = {}) {
  const employee = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId } });
  if (!employee) throw new AppError('Employee record not found', 404, 'EMPLOYEE_NOT_FOUND');
  return getEmployeeTna(auth, employee.id, input);
}

export async function analyzeEmployeeTna(auth, employeeId, input = {}) {
  const result = await buildEmployeeTna(auth, employeeId, input); const { employee, continuity, signals, gap, currentCycle } = result;
  await sequelize.transaction(async transaction => { for (const signal of signals) { const values = { tenantId: auth.tenantId, employeeId, cycleId: currentCycle?.id || null, sourceCycleId: signal.code === 'MISSING_REVIEW_DATA' ? null : Number(signal.sourceReferenceId) || null, signalCode: signal.code, skillArea: signal.code === 'MISSING_REVIEW_DATA' ? 'Data quality / review workflow' : 'Performance continuity', priority: priorityFor(signal.code, signal.magnitude), reason: signal.reason, recommendedTraining: recommendationFor(signal.code), sourceType: SIGNAL_SOURCE, sourceReferenceId: `${employeeId}:${signal.year}`, continuityGapScore: gap.score, riskLevel: gap.riskLevel, createdBy: auth.userId }; const existing = await TrainingNeed.findOne({ where: { tenantId: auth.tenantId, employeeId, sourceType: SIGNAL_SOURCE, sourceReferenceId: values.sourceReferenceId }, transaction, lock: transaction.LOCK.UPDATE }); if (existing) await existing.update({ ...values, status: existing.status }, { transaction }); else await TrainingNeed.create(values, { transaction }); } });
  return { employee: continuity.employee, summary: continuity.summary, signals, continuityGap: gap };
}

export async function listTrainingNeeds(auth, query = {}) {
  const where = { tenantId: auth.tenantId, ...(query.employeeId ? { employeeId: query.employeeId } : {}), ...(query.priority ? { priority: query.priority } : {}), ...(query.status ? { status: query.status } : {}), ...(query.signalCode ? { signalCode: query.signalCode } : {}) };
  if (auth.role === 'employee') { const employee = query.employeeId ? await employeeFor(auth, query.employeeId) : await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId } }); if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND'); where.employeeId = employee.id; }
  if (auth.role === 'manager') { const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] }); if (!manager?.departmentId) throw new AppError('Manager is not assigned to a department', 403, 'NO_MANAGER_DEPARTMENT'); const employees = await Employee.findAll({ where: { tenantId: auth.tenantId, departmentId: manager.departmentId }, attributes: ['id'] }); where.employeeId = { [Op.in]: employees.map(row => row.id) }; }
  const page = query.page || 1; const pageSize = query.pageSize || 50;
  const result = await TrainingNeed.findAndCountAll({ where, include: signalInclude, order: [['priority', 'DESC'], ['created_at', 'DESC']], limit: pageSize, offset: (page - 1) * pageSize, distinct: true });
  return { items: result.rows, pagination: { page, pageSize, total: result.count, totalPages: Math.ceil(result.count / pageSize) } };
}

export async function createTrainingNeed(auth, input) { const employee = await employeeFor(auth, input.employeeId); if (auth.role === 'employee') throw new AppError('Employees cannot create training needs', 403, 'TNA_WRITE_DENIED'); return TrainingNeed.create({ tenantId: auth.tenantId, createdBy: auth.userId, sourceType: 'manual', ...input, employeeId: employee.id }); }
export async function updateTrainingNeed(auth, id, input) { const need = await TrainingNeed.findOne({ where: { id, tenantId: auth.tenantId }, include: [{ model: Employee, as: 'employee' }] }); if (!need) throw new AppError('Training need not found', 404, 'TRAINING_NEED_NOT_FOUND'); await employeeFor(auth, need.employeeId); if (auth.role === 'employee') throw new AppError('Employees cannot update training needs', 403, 'TNA_WRITE_DENIED'); return need.update(input); }
