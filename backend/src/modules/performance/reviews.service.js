import { Op } from 'sequelize';
import { Employee, PerformanceCriterion, PerformanceCycle, PerformanceEvidence, PerformanceReview, PerformanceReviewScore, User } from '../../database/models/index.js';
import { sequelize } from '../../config/database.js';
import { AppError } from '../../middleware/error.js';
import { recordAudit } from '../../services/audit.service.js';
import { releasedCycleStatuses } from './access.js';

const include = [
  { model: Employee, as: 'employee', attributes: ['id', 'userId', 'employeeCode', 'departmentId'], include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] },
  { model: PerformanceCycle, as: 'cycle', attributes: ['id', 'name', 'status', 'year'] },
  { model: User, as: 'reviewer', attributes: ['id', 'name', 'email'] },
  { model: PerformanceReviewScore, as: 'scores', include: [{ model: PerformanceCriterion, as: 'criterion', attributes: ['id', 'name', 'category', 'weight', 'ratingScaleMin', 'ratingScaleMax'] }] }
];

async function employeeFor(auth, id) {
  const employee = await Employee.findOne({ where: { id, tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' } }, include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] });
  if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  return employee;
}

async function managerFor(auth) {
  const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId, employmentStatus: { [Op.ne]: 'terminated' } }, attributes: ['id', 'departmentId'] });
  if (!manager?.departmentId) throw new AppError('Manager is not assigned to a department', 403, 'NO_MANAGER_DEPARTMENT');
  return manager;
}

async function assertEmployeeScope(auth, employee) {
  if (auth.role === 'employee' && employee.userId !== auth.userId) throw new AppError('You may only access your own reviews', 403, 'REVIEW_ACCESS_DENIED');
  if (auth.role === 'manager' && (await managerFor(auth)).departmentId !== employee.departmentId) throw new AppError('Managers may only access reviews for their department', 403, 'REVIEW_ACCESS_DENIED');
}

async function reviewFor(auth, id) {
  const review = await PerformanceReview.findOne({ where: { id, tenantId: auth.tenantId }, include });
  if (!review) throw new AppError('Performance review not found', 404, 'PERFORMANCE_REVIEW_NOT_FOUND');
  await assertEmployeeScope(auth, review.employee);
  if (auth.role === 'employee' && review.reviewType !== 'self' && !releasedCycleStatuses.includes(review.cycle?.status)) throw new AppError('This manager feedback has not been released yet', 403, 'REVIEW_NOT_RELEASED');
  return review;
}

function assertReviewType(auth, type) {
  if (auth.role === 'employee' && type !== 'self') throw new AppError('Employees may only submit self reviews', 403, 'REVIEW_TYPE_DENIED');
  if (auth.role === 'manager' && type !== 'manager') throw new AppError('Managers may only submit manager reviews', 403, 'REVIEW_TYPE_DENIED');
  if (auth.role !== 'admin' && ['calibration', 'final', 'peer'].includes(type)) throw new AppError('This review type requires HR authorization', 403, 'REVIEW_TYPE_DENIED');
}

async function assertCycle(auth, id) {
  const cycle = await PerformanceCycle.findOne({ where: { id, tenantId: auth.tenantId } });
  if (!cycle) throw new AppError('Performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
  if (['completed', 'archived'].includes(cycle.status)) throw new AppError('Reviews cannot be changed after cycle completion', 409, 'PERFORMANCE_CYCLE_FROZEN');
  return cycle;
}

export async function listReviews(auth, query = {}) {
  const where = { tenantId: auth.tenantId, ...(query.cycleId ? { cycleId: query.cycleId } : {}), ...(query.reviewType ? { reviewType: query.reviewType } : {}), ...(query.status ? { status: query.status } : {}), ...(query.reviewerId ? { reviewerId: query.reviewerId } : {}) };
  if (query.employeeId) where.employeeId = query.employeeId;
  if (auth.role === 'employee') { where.employeeId = (await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['id'] }))?.id; if (query.reviewType !== 'self') where.status = 'released'; }
  if (auth.role === 'manager') {
    const manager = await managerFor(auth);
    const employees = await Employee.findAll({ where: { tenantId: auth.tenantId, departmentId: manager.departmentId }, attributes: ['id'] });
    where.employeeId = { [Op.in]: employees.map(row => row.id) };
  }
  if (auth.role === 'employee' && query.employeeId && where.employeeId !== query.employeeId) throw new AppError('You may only access your own reviews', 403, 'REVIEW_ACCESS_DENIED');
  return PerformanceReview.findAll({ where, include, order: [['created_at', 'DESC']] });
}

export async function getReview(auth, id) { return reviewFor(auth, id); }

export async function createReview(auth, input) {
  assertReviewType(auth, input.reviewType);
  await assertCycle(auth, input.cycleId);
  const employee = await employeeFor(auth, input.employeeId);
  await assertEmployeeScope(auth, employee);
  if (auth.role === 'manager' && input.reviewType === 'manager' && employee.userId === auth.userId) throw new AppError('Managers cannot submit a manager review for themselves', 403, 'REVIEW_SELF_DENIED');
  const duplicate = await PerformanceReview.findOne({ where: { tenantId: auth.tenantId, cycleId: input.cycleId, employeeId: input.employeeId, reviewType: input.reviewType } });
  if (duplicate) throw new AppError('A review of this type already exists for this employee and cycle', 409, 'PERFORMANCE_REVIEW_EXISTS');
  return sequelize.transaction(async transaction => {
    const criteria = await PerformanceCriterion.findAll({ where: { tenantId: auth.tenantId, id: { [Op.in]: input.scores.map(score => score.criterionId) }, isActive: true }, transaction });
    if (criteria.length !== input.scores.length) throw new AppError('One or more review criteria are invalid or inactive', 422, 'INVALID_REVIEW_CRITERIA');
    const review = await PerformanceReview.create({ tenantId: auth.tenantId, cycleId: input.cycleId, employeeId: input.employeeId, reviewerId: auth.userId, reviewType: input.reviewType, strengths: input.strengths ?? null, improvementAreas: input.improvementAreas ?? null, comments: input.comments ?? null, status: 'draft' }, { transaction });
    for (const score of input.scores) {
      const evidenceCount = await PerformanceEvidence.count({ where: { tenantId: auth.tenantId, cycleId: input.cycleId, employeeId: input.employeeId, criterionId: score.criterionId, verificationStatus: 'verified' }, transaction });
      await PerformanceReviewScore.create({ tenantId: auth.tenantId, reviewId: review.id, criterionId: score.criterionId, rawScore: score.rawScore, reviewerComment: score.reviewerComment ?? null, evidenceCount }, { transaction });
    }
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_review_created', entityType: 'performance_review', entityId: review.id, afterData: { ...review.toJSON(), scores: input.scores }, transaction });
    return reviewFor(auth, review.id);
  });
}

export async function submitReview(auth, id) {
  const review = await reviewFor(auth, id);
  if (review.reviewerId !== auth.userId && auth.role !== 'admin') throw new AppError('Only the assigned reviewer can submit this review', 403, 'REVIEW_SUBMIT_DENIED');
  if (!['draft', 'in_progress'].includes(review.status)) throw new AppError('This review has already been submitted or released', 409, 'REVIEW_ALREADY_SUBMITTED');
  const before = review.toJSON();
  await sequelize.transaction(async transaction => {
    await review.update({ status: 'submitted', submittedAt: new Date() }, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_review_submitted', entityType: 'performance_review', entityId: id, beforeData: before, afterData: review.toJSON(), transaction });
  });
  return reviewFor(auth, id);
}
