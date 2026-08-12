import { Op } from 'sequelize';
import { Employee, PerformanceCycle, PerformanceGoal, User } from '../../database/models/index.js';
import { AppError } from '../../middleware/error.js';
import { recordAudit } from '../../services/audit.service.js';

const goalInclude = [
  { model: Employee, as: 'employee', attributes: ['id', 'employeeCode', 'designation', 'departmentId'], include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] },
  { model: Employee, as: 'manager', attributes: ['id', 'employeeCode'], include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] },
  { model: PerformanceCycle, as: 'cycle', attributes: ['id', 'name', 'status', 'year'] },
  { model: User, as: 'creator', attributes: ['id', 'name'] }
];

async function employeeFor(auth, id) {
  const employee = await Employee.findOne({ where: { id, tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' } } });
  if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  return employee;
}

async function managerFor(auth) {
  const employee = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId, employmentStatus: { [Op.ne]: 'terminated' } } });
  if (!employee) throw new AppError('Manager employee profile not found', 403, 'MANAGER_PROFILE_NOT_FOUND');
  return employee;
}

async function assertAccess(auth, employee) {
  if (auth.role === 'employee') {
    const own = await employeeFor(auth, employee.id);
    if (own.userId !== auth.userId) throw new AppError('You may only access your own goals', 403, 'GOAL_ACCESS_DENIED');
  } else if (auth.role === 'manager') {
    const manager = await managerFor(auth);
    if (!manager.departmentId || manager.departmentId !== employee.departmentId) throw new AppError('Managers may only access goals for their department', 403, 'GOAL_ACCESS_DENIED');
  }
}

async function goalFor(auth, id) {
  const goal = await PerformanceGoal.findOne({ where: { id, tenantId: auth.tenantId }, include: goalInclude });
  if (!goal) throw new AppError('Performance goal not found', 404, 'PERFORMANCE_GOAL_NOT_FOUND');
  await assertAccess(auth, goal.employee);
  return goal;
}

export async function listGoals(auth, query = {}) {
  const where = { tenantId: auth.tenantId, ...(query.cycleId ? { cycleId: query.cycleId } : {}), ...(query.status ? { status: query.status } : {}) };
  if (query.employeeId) where.employeeId = query.employeeId;
  if (auth.role === 'employee') where.employeeId = (await managerFor({ ...auth, role: 'employee' })).id;
  if (auth.role === 'manager') {
    const manager = await managerFor(auth);
    const employees = await Employee.findAll({ where: { tenantId: auth.tenantId, departmentId: manager.departmentId }, attributes: ['id'] });
    where.employeeId = { [Op.in]: employees.map(row => row.id) };
  }
  if (auth.role === 'employee' && query.employeeId && where.employeeId !== query.employeeId) throw new AppError('You may only access your own goals', 403, 'GOAL_ACCESS_DENIED');
  return PerformanceGoal.findAll({ where, include: goalInclude, order: [['due_date', 'ASC'], ['created_at', 'DESC']] });
}

export async function getGoal(auth, id) { return goalFor(auth, id); }

export async function createGoal(auth, input) {
  const cycle = await PerformanceCycle.findOne({ where: { id: input.cycleId, tenantId: auth.tenantId } });
  if (!cycle) throw new AppError('Performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
  if (['completed', 'archived'].includes(cycle.status)) throw new AppError('Goals cannot be added to a completed or archived cycle', 409, 'PERFORMANCE_CYCLE_FROZEN');
  const employee = await employeeFor(auth, input.employeeId);
  let managerId = input.managerId ?? null;
  if (auth.role === 'manager') { const manager = await managerFor(auth); if (!manager.departmentId || manager.departmentId !== employee.departmentId) throw new AppError('Managers may only create goals for their department', 403, 'GOAL_ACCESS_DENIED'); managerId = manager.id; }
  if (managerId) await employeeFor(auth, managerId);
  const goal = await PerformanceGoal.create({ tenantId: auth.tenantId, createdBy: auth.userId, ...input, managerId });
  await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_goal_created', entityType: 'performance_goal', entityId: goal.id, afterData: goal.toJSON() });
  return goalFor(auth, goal.id);
}

export async function updateGoal(auth, id, input) {
  const goal = await goalFor(auth, id);
  if (['completed', 'archived'].includes(goal.cycle.status)) throw new AppError('Goals in a completed or archived cycle are immutable', 409, 'PERFORMANCE_CYCLE_FROZEN');
  if (input.status === 'completed') input.progressPercentage = 100;
  const before = goal.toJSON();
  await goal.update(input);
  await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_goal_updated', entityType: 'performance_goal', entityId: id, beforeData: before, afterData: goal.toJSON() });
  return goalFor(auth, id);
}

export async function carryForwardGoal(auth, id, input) {
  const source = await goalFor(auth, id);
  if (source.status === 'completed' || source.progressPercentage >= 100) throw new AppError('Completed goals cannot be carried forward', 409, 'GOAL_ALREADY_COMPLETED');
  const targetCycle = await PerformanceCycle.findOne({ where: { id: input.targetCycleId, tenantId: auth.tenantId } });
  if (!targetCycle) throw new AppError('Target performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
  if (['completed', 'archived'].includes(targetCycle.status)) throw new AppError('Goals cannot be carried into a completed or archived cycle', 409, 'PERFORMANCE_CYCLE_FROZEN');
  const existing = await PerformanceGoal.findOne({ where: { tenantId: auth.tenantId, previousGoalId: source.id, cycleId: targetCycle.id } });
  if (existing) return goalFor(auth, existing.id);
  const carried = await PerformanceGoal.create({ tenantId: auth.tenantId, cycleId: targetCycle.id, employeeId: source.employeeId, title: input.title || source.title, description: input.description ?? source.description, goalType: source.goalType, targetValue: source.targetValue, unit: source.unit, weight: source.weight, dueDate: input.dueDate ?? null, status: 'not_started', progressPercentage: 0, managerId: source.managerId, previousGoalId: source.id, continuityStatus: 'carried_forward', createdBy: auth.userId });
  await source.update({ continuityStatus: 'carried_forward' });
  await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_goal_carried_forward', entityType: 'performance_goal', entityId: carried.id, afterData: { previousGoalId: source.id, targetCycleId: targetCycle.id } });
  return goalFor(auth, carried.id);
}
