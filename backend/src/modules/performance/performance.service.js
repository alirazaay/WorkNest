import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Employee, PerformanceAppraisalExplanation, PerformanceCriterion, PerformanceCycle, PerformanceTemplate, PerformanceTemplateCriterion, User } from '../../database/models/index.js';
import { AppError } from '../../middleware/error.js';
import { recordAudit } from '../../services/audit.service.js';
import { createNotification } from '../../services/notification.service.js';

const statuses = ['draft', 'active', 'review', 'calibration', 'completed', 'archived'];
const transitions = { draft: ['active', 'archived'], active: ['review', 'archived'], review: ['calibration', 'completed'], calibration: ['completed'], completed: ['archived'], archived: [] };

export function canTransitionCycle(from, to) { return statuses.includes(to) && Boolean(transitions[from]?.includes(to)); }

export function validateCycleActivation(template) {
  if (!template) throw new AppError('Activate a performance template before activating this cycle', 422, 'CYCLE_ACTIVATION_TEMPLATE_REQUIRED');
  const criteria = template.criteria || [];
  if (!criteria.length) throw new AppError('The active performance template must contain at least one criterion', 422, 'CYCLE_ACTIVATION_CRITERIA_REQUIRED');
  const totalWeight = criteria.reduce((total, row) => total + Number(row.weight || 0), 0);
  if (Math.abs(totalWeight - 100) > 0.001) throw new AppError(`The active performance template criteria weights must total 100%. Current total: ${totalWeight.toFixed(3)}%`, 422, 'CYCLE_ACTIVATION_WEIGHTS_INCOMPLETE');
}

async function activationTemplateFor(auth, transaction) {
  const template = await PerformanceTemplate.findOne({
    where: { tenantId: auth.tenantId, status: 'active' },
    include: [{
      model: PerformanceTemplateCriterion,
      as: 'criteria',
      required: false,
      include: [{ model: PerformanceCriterion, as: 'criterion', where: { tenantId: auth.tenantId, isActive: true }, required: true }]
    }],
    order: [['id', 'DESC']],
    transaction,
  });
  validateCycleActivation(template);
  return template;
}

function assertDates(input) {
  const dates = [input.startDate, input.endDate, input.goalSettingStart, input.goalSettingEnd, input.reviewStart, input.reviewEnd].filter(Boolean).map(value => new Date(`${value}T00:00:00Z`));
  if (dates.some(date => Number.isNaN(date.getTime()))) throw new AppError('Performance cycle dates are invalid', 422, 'INVALID_CYCLE_DATES');
  if (dates[0] > dates[1]) throw new AppError('Cycle end date must be after its start date', 422, 'INVALID_CYCLE_DATES');
  if (input.goalSettingStart && input.goalSettingEnd && input.goalSettingStart > input.goalSettingEnd) throw new AppError('Goal-setting end date must be after its start date', 422, 'INVALID_CYCLE_DATES');
  if (input.reviewStart && input.reviewEnd && input.reviewStart > input.reviewEnd) throw new AppError('Review end date must be after its start date', 422, 'INVALID_CYCLE_DATES');
}

function includeCreator() { return { model: User, as: 'creator', attributes: ['id', 'name'] }; }

export async function listPerformanceCycles(auth, query = {}) {
  return PerformanceCycle.findAll({ where: { tenantId: auth.tenantId, ...(query.status ? { status: query.status } : {}), ...(query.year ? { year: query.year } : {}), ...(query.cycleType ? { cycleType: query.cycleType } : {}) }, include: [includeCreator()], order: [['year', 'DESC'], ['start_date', 'DESC']] });
}

export async function getPerformanceCycle(auth, id) {
  const cycle = await PerformanceCycle.findOne({ where: { id, tenantId: auth.tenantId }, include: [includeCreator()] });
  if (!cycle) throw new AppError('Performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
  return cycle;
}

export async function createPerformanceCycle(auth, input) {
  assertDates(input);
  const duplicate = await PerformanceCycle.findOne({ where: { tenantId: auth.tenantId, year: input.year, cycleType: input.cycleType } });
  if (duplicate) throw new AppError('A performance cycle already exists for this year and cycle type', 409, 'PERFORMANCE_CYCLE_EXISTS');
  return sequelize.transaction(async transaction => {
    const cycle = await PerformanceCycle.create({ tenantId: auth.tenantId, createdBy: auth.userId, ...input, status: 'draft' }, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_cycle_created', entityType: 'performance_cycle', entityId: cycle.id, afterData: cycle.toJSON(), transaction });
    return cycle;
  });
}

export async function updatePerformanceCycle(auth, id, input) {
  let cycle;
  try {
    cycle = await sequelize.transaction(async transaction => {
    const current = await PerformanceCycle.findOne({ where: { id, tenantId: auth.tenantId }, include: [includeCreator()], transaction, lock: transaction.LOCK.UPDATE });
    if (!current) throw new AppError('Performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
    if (current.status !== 'draft' && Object.keys(input).some(key => key !== 'status')) throw new AppError('Cycle configuration is frozen after activation', 409, 'PERFORMANCE_CYCLE_FROZEN');
    if (input.status && !canTransitionCycle(current.status, input.status)) throw new AppError(`Cannot move a ${current.status} cycle to ${input.status}`, 409, 'INVALID_PERFORMANCE_CYCLE_TRANSITION');
    const next = { ...current.toJSON(), ...input };
    assertDates(next);
    if (input.status === 'active') {
      await activationTemplateFor(auth, transaction);
      const active = await PerformanceCycle.findOne({ where: { tenantId: auth.tenantId, year: current.year, cycleType: current.cycleType, status: 'active', id: { [Op.ne]: id } }, transaction, lock: transaction.LOCK.UPDATE });
      if (active) throw new AppError('Another active cycle already exists for this year and cycle type', 409, 'ACTIVE_PERFORMANCE_CYCLE_EXISTS');
    }
    const before = current.toJSON();
    await current.update(input, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: input.status ? `performance_cycle_${input.status}` : 'performance_cycle_updated', entityType: 'performance_cycle', entityId: id, beforeData: before, afterData: current.toJSON(), transaction });
      return current;
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') throw new AppError('Another performance cycle already exists for this year and cycle type', 409, 'PERFORMANCE_CYCLE_EXISTS');
    throw error;
  }
  if (input.status === 'review') await notifyManagersForReview(auth);
  if (input.status === 'calibration') await notifyAdminsForCalibration(auth);
  if (input.status === 'completed') await notifyReleasedAppraisals(auth, id);
  return getPerformanceCycle(auth, id);
}

async function notifyManagersForReview(auth) {
  const [managers, employeeCount] = await Promise.all([
    User.findAll({ where: { tenantId: auth.tenantId, role: 'manager' }, attributes: ['id'] }),
    Employee.count({ where: { tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' } } })
  ]);
  await Promise.all(managers.map(manager => createNotification({ tenantId: auth.tenantId, userId: manager.id, type: 'performance_reviews_awaiting', title: 'Performance reviews awaiting submission', message: `${employeeCount} employee review${employeeCount === 1 ? '' : 's'} ${employeeCount === 1 ? 'is' : 'are'} awaiting submission.`, entityType: 'performance_cycle' })));
}

async function notifyAdminsForCalibration(auth) {
  const admins = await User.findAll({ where: { tenantId: auth.tenantId, role: 'admin' }, attributes: ['id'] });
  await Promise.all(admins.map(admin => createNotification({ tenantId: auth.tenantId, userId: admin.id, type: 'performance_calibration_started', title: 'Performance calibration begins', message: 'The performance calibration workspace is ready for HR review.', entityType: 'performance_cycle' })));
}

async function notifyReleasedAppraisals(auth, cycleId) {
  const explanations = await PerformanceAppraisalExplanation.findAll({ where: { tenantId: auth.tenantId, cycleId }, attributes: ['employeeId', 'id'] });
  if (!explanations.length) return;
  const employees = await Employee.findAll({ where: { tenantId: auth.tenantId, id: explanations.map(row => row.employeeId) }, attributes: ['id', 'userId'] });
  await Promise.all(employees.filter(employee => employee.userId).map(employee => createNotification({ tenantId: auth.tenantId, userId: employee.userId, type: 'performance_review_released', title: 'Your performance review has been released', message: 'Your finalized performance appraisal is now available in My Performance.', entityType: 'performance_appraisal_explanation', entityId: explanations.find(row => row.employeeId === employee.id)?.id })));
}
