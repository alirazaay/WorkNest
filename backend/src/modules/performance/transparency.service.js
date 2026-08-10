import { Op } from 'sequelize';
import { Employee, PerformanceAppraisalExplanation, PerformanceCycle, PerformanceGoal, PerformanceReview, PerformanceReviewScore, PerformanceCriterion, User } from '../../database/models/index.js';
import { AppError } from '../../middleware/error.js';

const releasedReviewStatuses = ['released'];

export async function getEmployeeTransparency(auth, cycleId) {
  if (auth.role !== 'employee') throw new AppError('This endpoint is available to employees only', 403, 'TRANSPARENCY_ACCESS_DENIED');
  const employee = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId, employmentStatus: { [Op.ne]: 'terminated' } }, include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] });
  if (!employee) throw new AppError('Employee record not found', 404, 'EMPLOYEE_NOT_FOUND');
  const cycleWhere = { tenantId: auth.tenantId, status: { [Op.in]: ['completed', 'archived'] } };
  if (cycleId) cycleWhere.id = cycleId;
  const cycles = await PerformanceCycle.findAll({ where: cycleWhere, attributes: ['id', 'name', 'year', 'status', 'startDate', 'endDate'], order: [['year', 'DESC'], ['id', 'DESC']] });
  const cycleIds = cycles.map(cycle => cycle.id);
  if (!cycleIds.length) return { employee: employee.toJSON(), reports: [], goals: [], feedback: [] };
  const explanations = await PerformanceAppraisalExplanation.findAll({ where: { tenantId: auth.tenantId, employeeId: employee.id, cycleId: { [Op.in]: cycleIds } }, order: [['generated_at', 'DESC']] });
  const goals = await PerformanceGoal.findAll({ where: { tenantId: auth.tenantId, employeeId: employee.id, cycleId: { [Op.in]: cycleIds } }, order: [['due_date', 'ASC'], ['id', 'ASC']] });
  const reviews = await PerformanceReview.findAll({ where: { tenantId: auth.tenantId, employeeId: employee.id, cycleId: { [Op.in]: cycleIds }, status: { [Op.in]: releasedReviewStatuses } }, include: [{ model: PerformanceReviewScore, as: 'scores', include: [{ model: PerformanceCriterion, as: 'criterion', attributes: ['id', 'name', 'category'] }] }], order: [['submitted_at', 'DESC']] });
  const cycleMap = new Map(cycles.map(cycle => [cycle.id, cycle.toJSON()]));
  return {
    employee: { id: employee.id, employeeCode: employee.employeeCode, designation: employee.designation, name: employee.user?.name || null },
    reports: explanations.map(report => ({ ...report.toJSON(), cycle: cycleMap.get(report.cycleId) || null })),
    goals: goals.map(goal => ({ ...goal.toJSON(), cycle: cycleMap.get(goal.cycleId) || null })),
    feedback: reviews.map(review => ({ ...review.toJSON(), cycle: cycleMap.get(review.cycleId) || null }))
  };
}
