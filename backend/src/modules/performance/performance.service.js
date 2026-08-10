import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { PerformanceCycle, User } from '../../database/models/index.js';
import { AppError } from '../../middleware/error.js';
import { recordAudit } from '../../services/audit.service.js';

const statuses = ['draft', 'active', 'review', 'calibration', 'completed', 'archived'];
const transitions = { draft: ['active', 'archived'], active: ['review', 'archived'], review: ['calibration', 'completed'], calibration: ['completed'], completed: ['archived'], archived: [] };

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
  const cycle = await getPerformanceCycle(auth, id);
  if (cycle.status !== 'draft' && Object.keys(input).some(key => key !== 'status')) throw new AppError('Cycle configuration is frozen after activation', 409, 'PERFORMANCE_CYCLE_FROZEN');
  if (input.status && (!statuses.includes(input.status) || !transitions[cycle.status].includes(input.status))) throw new AppError(`Cannot move a ${cycle.status} cycle to ${input.status}`, 409, 'INVALID_PERFORMANCE_CYCLE_TRANSITION');
  const next = { ...cycle.toJSON(), ...input };
  assertDates(next);
  if (input.status === 'active') {
    const active = await PerformanceCycle.findOne({ where: { tenantId: auth.tenantId, year: cycle.year, cycleType: cycle.cycleType, status: 'active', id: { [Op.ne]: id } } });
    if (active) throw new AppError('Another active cycle already exists for this year and cycle type', 409, 'ACTIVE_PERFORMANCE_CYCLE_EXISTS');
  }
  const before = cycle.toJSON();
  await cycle.update(input);
  await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: input.status ? `performance_cycle_${input.status}` : 'performance_cycle_updated', entityType: 'performance_cycle', entityId: id, beforeData: before, afterData: cycle.toJSON() });
  return getPerformanceCycle(auth, id);
}
