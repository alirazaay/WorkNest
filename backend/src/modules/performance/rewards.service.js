import { Op } from 'sequelize';
import { Employee, PerformanceCycle, PerformanceReward, User } from '../../database/models/index.js';
import { sequelize } from '../../config/database.js';
import { AppError } from '../../middleware/error.js';
import { recordAudit } from '../../services/audit.service.js';

const include = [{ model: Employee, as: 'employee', attributes: ['id', 'employeeCode', 'departmentId'], include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] }, { model: PerformanceCycle, as: 'cycle', attributes: ['id', 'name', 'year', 'status'] }, { model: User, as: 'recommender', attributes: ['id', 'name'] }, { model: User, as: 'approver', attributes: ['id', 'name'] }];

async function employeeFor(auth, id) {
  const employee = await Employee.findOne({ where: { id, tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' } } });
  if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  if (auth.role === 'manager') {
    const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] });
    if (!manager?.departmentId || manager.departmentId !== employee.departmentId) throw new AppError('Managers may only recommend rewards for their department', 403, 'REWARD_ACCESS_DENIED');
  }
  return employee;
}

async function cycleFor(auth, id) {
  const cycle = await PerformanceCycle.findOne({ where: { id, tenantId: auth.tenantId } });
  if (!cycle) throw new AppError('Performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
  return cycle;
}

export async function listRewards(auth, query = {}) {
  const where = { tenantId: auth.tenantId, ...(query.cycleId ? { cycleId: query.cycleId } : {}), ...(query.employeeId ? { employeeId: query.employeeId } : {}), ...(query.rewardType ? { rewardType: query.rewardType } : {}), ...(query.status ? { status: query.status } : {}) };
  if (auth.role === 'manager') {
    const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] });
    if (!manager?.departmentId) throw new AppError('Manager is not assigned to a department', 403, 'NO_MANAGER_DEPARTMENT');
    const employees = await Employee.findAll({ where: { tenantId: auth.tenantId, departmentId: manager.departmentId }, attributes: ['id'] });
    where.employeeId = { [Op.in]: employees.map(row => row.id) };
  }
  const page = query.page || 1; const pageSize = query.pageSize || 50;
  const result = await PerformanceReward.findAndCountAll({ where, include, order: [['created_at', 'DESC']], limit: pageSize, offset: (page - 1) * pageSize, distinct: true });
  return { items: result.rows, pagination: { page, pageSize, total: result.count, totalPages: Math.ceil(result.count / pageSize) } };
}

export async function createReward(auth, input) {
  await employeeFor(auth, input.employeeId); await cycleFor(auth, input.cycleId);
  const existing = await PerformanceReward.findOne({ where: { tenantId: auth.tenantId, cycleId: input.cycleId, employeeId: input.employeeId, rewardType: input.rewardType } });
  if (existing) throw new AppError('A reward recommendation of this type already exists for this employee and cycle', 409, 'PERFORMANCE_REWARD_EXISTS');
  const reward = await PerformanceReward.create({ tenantId: auth.tenantId, recommendedBy: auth.userId, recommendedValue: input.recommendedValue, reason: input.reason, cycleId: input.cycleId, employeeId: input.employeeId, rewardType: input.rewardType, status: 'recommended' });
  await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_reward_recommended', entityType: 'performance_reward', entityId: reward.id, afterData: reward.toJSON() });
  return PerformanceReward.findOne({ where: { id: reward.id, tenantId: auth.tenantId }, include });
}

export async function approveReward(auth, id, input) {
  const reward = await PerformanceReward.findOne({ where: { id, tenantId: auth.tenantId } });
  if (!reward) throw new AppError('Performance reward not found', 404, 'PERFORMANCE_REWARD_NOT_FOUND');
  if (reward.status !== 'recommended') throw new AppError('Only recommended rewards can be approved', 409, 'REWARD_STATUS_INVALID');
  const before = reward.toJSON();
  await sequelize.transaction(async transaction => {
    await reward.update({ status: 'approved', approvedValue: input.approvedValue ?? reward.recommendedValue, approvedBy: auth.userId, approvedAt: new Date(), approvalReason: input.approvalReason ?? null }, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_reward_approved', entityType: 'performance_reward', entityId: id, beforeData: before, afterData: reward.toJSON(), transaction });
  });
  return PerformanceReward.findOne({ where: { id, tenantId: auth.tenantId }, include });
}

export async function rejectReward(auth, id, input) {
  const reward = await PerformanceReward.findOne({ where: { id, tenantId: auth.tenantId } });
  if (!reward) throw new AppError('Performance reward not found', 404, 'PERFORMANCE_REWARD_NOT_FOUND');
  if (reward.status !== 'recommended') throw new AppError('Only recommended rewards can be rejected', 409, 'REWARD_STATUS_INVALID');
  const before = reward.toJSON(); await reward.update({ status: 'rejected', approvedBy: auth.userId, approvedAt: new Date(), approvalReason: input.reason });
  await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_reward_rejected', entityType: 'performance_reward', entityId: id, beforeData: before, afterData: reward.toJSON() });
  return PerformanceReward.findOne({ where: { id, tenantId: auth.tenantId }, include });
}
