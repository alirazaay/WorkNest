import { Op } from 'sequelize';
import { Employee, PerformanceCycle, PerformanceEquivalenceGroup, PerformanceEquivalenceMember, PerformanceEquivalenceSetting, PerformanceScoreSnapshot, PerformanceSignature, User } from '../../database/models/index.js';
import { AppError } from '../../middleware/error.js';

export async function compareEmployees(auth, input) {
  const cycle = await PerformanceCycle.findOne({ where: { id: input.cycleId, tenantId: auth.tenantId }, attributes: ['id', 'name', 'year', 'status'] });
  if (!cycle) throw new AppError('Performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
  const employees = await Employee.findAll({ where: { tenantId: auth.tenantId, id: { [Op.in]: input.employeeIds }, employmentStatus: { [Op.ne]: 'terminated' } }, attributes: ['id', 'employeeCode', 'designation', 'departmentId'], include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] });
  if (employees.length !== input.employeeIds.length) throw new AppError('One or more employees were not found in this workspace', 404, 'PERFORMANCE_EMPLOYEE_NOT_FOUND');
  if (auth.role === 'manager') {
    const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] });
    if (!manager?.departmentId || employees.some(employee => employee.departmentId !== manager.departmentId)) throw new AppError('Managers may compare only employees in their department', 403, 'PERFORMANCE_COMPARE_ACCESS_DENIED');
  }
  const snapshots = await PerformanceScoreSnapshot.findAll({ where: { tenantId: auth.tenantId, cycleId: cycle.id, employeeId: { [Op.in]: input.employeeIds } } });
  if (snapshots.length !== employees.length) throw new AppError('All selected employees must have calculated performance scores', 409, 'PERFORMANCE_SCORES_INCOMPLETE');
  const signatures = await PerformanceSignature.findAll({ where: { tenantId: auth.tenantId, cycleId: cycle.id, employeeId: { [Op.in]: input.employeeIds } }, attributes: ['employeeId', 'signatureName', 'strongestFactors'] });
  const groups = await PerformanceEquivalenceGroup.findAll({ where: { tenantId: auth.tenantId, cycleId: cycle.id }, include: [{ model: PerformanceEquivalenceMember, as: 'members', where: { tenantId: auth.tenantId }, required: false }] });
  const snapshotMap = new Map(snapshots.map(row => [row.employeeId, row]));
  const signatureMap = new Map(signatures.map(row => [row.employeeId, row]));
  const groupMap = new Map();
  for (const group of groups) for (const member of group.members || []) groupMap.set(member.employeeId, group);
  const rows = employees.map(employee => { const snapshot = snapshotMap.get(employee.id); const signature = signatureMap.get(employee.id); const group = groupMap.get(employee.id); return { employee: { id: employee.id, employeeCode: employee.employeeCode, name: employee.user?.name || null, designation: employee.designation }, score: Number(snapshot.finalScore), ratingBand: snapshot.ratingBand, signature: signature?.signatureName || null, strongestFactors: signature?.strongestFactors || [], equivalenceGroupId: group?.id || null }; });
  const scores = rows.map(row => row.score); const spread = Math.max(...scores) - Math.min(...scores); const settings = await PerformanceEquivalenceSetting.findOne({ where: { tenantId: auth.tenantId }, attributes: ['threshold', 'strictRanking'] }); const threshold = Number(settings?.threshold ?? 1); const sameBand = new Set(rows.map(row => row.ratingBand)).size <= 1; const equivalent = !settings?.strictRanking && sameBand && spread <= threshold;
  return { cycle, employees: rows, comparison: { equivalent, conclusion: equivalent ? 'Performance Equivalent' : 'Performance differentiation requires review', spread: Number(spread.toFixed(3)), threshold, sameRatingBand: sameBand, strictRanking: Boolean(settings?.strictRanking) } };
}
