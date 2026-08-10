import { Op } from 'sequelize';
import { Employee, PerformanceCriterion, PerformanceCycle, PerformanceEvidence, PerformanceGoal, User } from '../../database/models/index.js';
import { AppError } from '../../middleware/error.js';
import { recordAudit } from '../../services/audit.service.js';

const include = [
  { model: Employee, as: 'employee', attributes: ['id', 'employeeCode', 'departmentId'], include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] },
  { model: PerformanceCycle, as: 'cycle', attributes: ['id', 'name', 'status', 'year'] },
  { model: PerformanceGoal, as: 'goal', attributes: ['id', 'title', 'employeeId'] },
  { model: PerformanceCriterion, as: 'criterion', attributes: ['id', 'name', 'category'] },
  { model: User, as: 'submitter', attributes: ['id', 'name'] },
  { model: User, as: 'verifier', attributes: ['id', 'name'] }
];

function safeEvidence(row) {
  const data = row.toJSON ? row.toJSON() : { ...row };
  if (data.storageKey) { data.attachmentAvailable = true; delete data.storageKey; } else data.attachmentAvailable = false;
  return data;
}

async function employeeFor(auth, id) {
  const employee = await Employee.findOne({ where: { id, tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' } } });
  if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  return employee;
}

async function assertAccess(auth, employee) {
  if (auth.role === 'employee' && employee.userId !== auth.userId) throw new AppError('You may only access your own evidence', 403, 'EVIDENCE_ACCESS_DENIED');
  if (auth.role === 'manager') {
    const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] });
    if (!manager?.departmentId || manager.departmentId !== employee.departmentId) throw new AppError('Managers may only access evidence for their department', 403, 'EVIDENCE_ACCESS_DENIED');
  }
}

async function evidenceFor(auth, id) {
  const evidence = await PerformanceEvidence.findOne({ where: { id, tenantId: auth.tenantId }, include });
  if (!evidence) throw new AppError('Performance evidence not found', 404, 'PERFORMANCE_EVIDENCE_NOT_FOUND');
  await assertAccess(auth, evidence.employee);
  return evidence;
}

async function assertReferences(auth, input) {
  const cycle = await PerformanceCycle.findOne({ where: { id: input.cycleId, tenantId: auth.tenantId } });
  if (!cycle) throw new AppError('Performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
  if (['completed', 'archived'].includes(cycle.status)) throw new AppError('Evidence cannot be added to a completed or archived cycle', 409, 'PERFORMANCE_CYCLE_FROZEN');
  const employee = await employeeFor(auth, input.employeeId);
  await assertAccess(auth, employee);
  if (input.goalId) {
    const goal = await PerformanceGoal.findOne({ where: { id: input.goalId, tenantId: auth.tenantId, cycleId: input.cycleId, employeeId: input.employeeId } });
    if (!goal) throw new AppError('Goal does not belong to this employee and cycle', 422, 'INVALID_EVIDENCE_GOAL');
  }
  if (input.criterionId && !(await PerformanceCriterion.findOne({ where: { id: input.criterionId, tenantId: auth.tenantId, isActive: true } }))) throw new AppError('Performance criterion not found or inactive', 404, 'PERFORMANCE_CRITERION_NOT_FOUND');
  return employee;
}

export async function listEvidence(auth, query = {}) {
  const where = { tenantId: auth.tenantId, ...(query.cycleId ? { cycleId: query.cycleId } : {}), ...(query.goalId ? { goalId: query.goalId } : {}), ...(query.criterionId ? { criterionId: query.criterionId } : {}), ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}) };
  if (query.employeeId) where.employeeId = query.employeeId;
  if (auth.role === 'employee') where.employeeId = (await employeeFor(auth, (await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['id'] }))?.id)).id;
  if (auth.role === 'manager') {
    const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] });
    if (!manager?.departmentId) throw new AppError('Manager is not assigned to a department', 403, 'NO_MANAGER_DEPARTMENT');
    const employees = await Employee.findAll({ where: { tenantId: auth.tenantId, departmentId: manager.departmentId }, attributes: ['id'] });
    where.employeeId = { [Op.in]: employees.map(row => row.id) };
  }
  if (auth.role === 'employee' && query.employeeId && where.employeeId !== query.employeeId) throw new AppError('You may only access your own evidence', 403, 'EVIDENCE_ACCESS_DENIED');
  const rows = await PerformanceEvidence.findAll({ where, include, order: [['event_date', 'DESC'], ['created_at', 'DESC']] });
  return rows.map(safeEvidence);
}

export async function createEvidence(auth, input, file) {
  await assertReferences(auth, input);
  const evidence = await PerformanceEvidence.create({ tenantId: auth.tenantId, submittedBy: auth.userId, ...input, ...(file ? { fileName: file.originalname, storageKey: file.path, mimeType: file.mimetype, fileSize: file.size } : {}) });
  await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_evidence_submitted', entityType: 'performance_evidence', entityId: evidence.id, afterData: { ...evidence.toJSON(), storageKey: undefined } });
  return safeEvidence(await evidenceFor(auth, evidence.id));
}

export async function verifyEvidence(auth, id, input) {
  const evidence = await evidenceFor(auth, id);
  if (auth.role === 'employee') throw new AppError('Employees cannot verify evidence', 403, 'EVIDENCE_VERIFICATION_DENIED');
  if (['completed', 'archived'].includes(evidence.cycle?.status)) throw new AppError('Evidence in a completed or archived cycle is immutable', 409, 'PERFORMANCE_CYCLE_FROZEN');
  const before = evidence.toJSON();
  await evidence.update({ verificationStatus: input.verificationStatus, verifiedBy: auth.userId });
  await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: `performance_evidence_${input.verificationStatus}`, entityType: 'performance_evidence', entityId: id, beforeData: { ...before, storageKey: undefined }, afterData: { ...evidence.toJSON(), storageKey: undefined } });
  return safeEvidence(await evidenceFor(auth, id));
}
