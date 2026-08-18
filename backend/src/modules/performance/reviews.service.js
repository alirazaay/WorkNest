import { Op } from 'sequelize';
import { Employee, PerformanceCalibrationDecision, PerformanceCriterion, PerformanceCycle, PerformanceEvidence, PerformanceReview, PerformanceReviewRevision, PerformanceReviewScore, PerformanceTemplate, PerformanceTemplateCriterion, User } from '../../database/models/index.js';
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

async function reviewFor(auth, id, transaction) {
  const review = await PerformanceReview.findOne({ where: { id, tenantId: auth.tenantId }, include, ...(transaction ? { transaction } : {}) });
  if (!review) throw new AppError('Performance review not found', 404, 'PERFORMANCE_REVIEW_NOT_FOUND');
  await assertEmployeeScope(auth, review.employee);
  if (auth.role === 'employee' && review.reviewType !== 'self' && !releasedCycleStatuses.includes(review.cycle?.status)) throw new AppError('This manager feedback has not been released yet', 403, 'REVIEW_NOT_RELEASED');
  return review;
}

/**
 * Resolve the criteria that are applicable to a review cycle.
 * Criteria are selected through the active tenant template's assignments,
 * never from the global tenant criteria list. The assignment table has a
 * unique (tenant, template, criterion) key, and the defensive Set also keeps
 * malformed legacy rows from being returned twice.
 */
export function selectApplicableReviewCriteria(assignments, templateId) {
  const seen = new Set();
  return assignments
    .slice()
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || a.id - b.id)
    .filter((assignment) => !seen.has(assignment.criterionId) && seen.add(assignment.criterionId))
    .map((assignment) => ({
      ...assignment.criterion.toJSON(),
      weight: assignment.weight,
      ratingScaleMin: assignment.ratingScaleMin ?? assignment.criterion.ratingScaleMin,
      ratingScaleMax: assignment.ratingScaleMax ?? assignment.criterion.ratingScaleMax,
      evidenceRequired: assignment.evidenceRequired ?? assignment.criterion.evidenceRequired,
      templateId,
      assignmentId: assignment.id,
      sortOrder: assignment.sortOrder
    }));
}

export async function listCycleReviewCriteria(auth, cycleId, transaction) {
  const cycle = await PerformanceCycle.findOne({ where: { id: cycleId, tenantId: auth.tenantId }, attributes: ['id'], ...(transaction ? { transaction } : {}) });
  if (!cycle) throw new AppError('Performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
  const template = await PerformanceTemplate.findOne({
    where: { tenantId: auth.tenantId, status: 'active' },
    order: [['id', 'DESC']],
    ...(transaction ? { transaction } : {})
  });
  if (!template) throw new AppError('Activate a performance template before creating reviews', 422, 'REVIEW_TEMPLATE_REQUIRED');
  // Keep the template lookup and assignment lookup separate. A required
  // nested include under Sequelize findOne can generate a MySQL subquery that
  // references the outer assignment alias before it exists. Two scoped reads
  // are deterministic, portable, and avoid that invalid SQL shape.
  const assignments = await PerformanceTemplateCriterion.findAll({
    where: { tenantId: auth.tenantId, templateId: template.id },
    include: [{ model: PerformanceCriterion, as: 'criterion', where: { tenantId: auth.tenantId, isActive: true }, required: true }],
    order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    ...(transaction ? { transaction } : {})
  });
  return selectApplicableReviewCriteria(assignments, template.id);
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
  const page = query.page || 1; const pageSize = query.pageSize || 50;
  const result = await PerformanceReview.findAndCountAll({ where, include, order: [['created_at', 'DESC']], limit: pageSize, offset: (page - 1) * pageSize, distinct: true });
  return { items: result.rows, pagination: { page, pageSize, total: result.count, totalPages: Math.ceil(result.count / pageSize) } };
}

export async function getReview(auth, id) { return reviewFor(auth, id); }

export async function createReview(auth, input) {
  assertReviewType(auth, input.reviewType);
  await assertCycle(auth, input.cycleId);
  const employee = await employeeFor(auth, input.employeeId);
  await assertEmployeeScope(auth, employee);
  if (auth.role === 'manager' && input.reviewType === 'manager' && employee.userId === auth.userId) throw new AppError('Managers cannot submit a manager review for themselves', 403, 'REVIEW_SELF_DENIED');
  return sequelize.transaction(async transaction => {
    const duplicate = await PerformanceReview.findOne({ where: { tenantId: auth.tenantId, cycleId: input.cycleId, employeeId: input.employeeId, reviewType: input.reviewType }, transaction, lock: transaction.LOCK.UPDATE });
    if (duplicate) throw new AppError('A review of this type already exists for this employee and cycle', 409, 'PERFORMANCE_REVIEW_EXISTS');
    const criteria = await listCycleReviewCriteria(auth, input.cycleId, transaction);
    const applicableIds = new Set(criteria.map((criterion) => criterion.id));
    if (input.scores.some((score) => !applicableIds.has(score.criterionId))) throw new AppError('One or more review criteria are not assigned to this cycle template', 422, 'INVALID_REVIEW_CRITERIA');
    if (criteria.length !== input.scores.length) throw new AppError('One or more review criteria are invalid or inactive', 422, 'INVALID_REVIEW_CRITERIA');
    const review = await PerformanceReview.create({ tenantId: auth.tenantId, cycleId: input.cycleId, employeeId: input.employeeId, reviewerId: auth.userId, reviewType: input.reviewType, strengths: input.strengths ?? null, improvementAreas: input.improvementAreas ?? null, comments: input.comments ?? null, status: 'draft' }, { transaction });
    for (const score of input.scores) {
      const evidenceCount = await PerformanceEvidence.count({ where: { tenantId: auth.tenantId, cycleId: input.cycleId, employeeId: input.employeeId, criterionId: score.criterionId, verificationStatus: 'verified' }, transaction });
      await PerformanceReviewScore.create({ tenantId: auth.tenantId, reviewId: review.id, criterionId: score.criterionId, rawScore: score.rawScore, reviewerComment: score.reviewerComment ?? null, evidenceCount }, { transaction });
    }
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_review_created', entityType: 'performance_review', entityId: review.id, afterData: { ...review.toJSON(), scores: input.scores }, transaction });
    // The row is still uncommitted. Reload using the same transaction so the
    // newly-created draft is visible and returned to the POST caller.
    return reviewFor(auth, review.id, transaction);
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

export async function updateReview(auth, id, input) {
  const review = await reviewFor(auth, id);
  if (!['draft', 'in_progress'].includes(review.status)) throw new AppError('Only draft reviews can be edited. Reopen a confirmed review for correction first.', 409, 'REVIEW_EDIT_LOCKED');
  if (review.reviewerId !== auth.userId && auth.role !== 'admin') throw new AppError('Only the assigned reviewer can edit this review', 403, 'REVIEW_EDIT_DENIED');
  return sequelize.transaction(async transaction => {
    const criteria = await listCycleReviewCriteria(auth, review.cycleId, transaction);
    const applicableIds = new Set(criteria.map(criterion => criterion.id));
    if (input.scores.some(score => !applicableIds.has(score.criterionId)) || criteria.length !== input.scores.length) throw new AppError('One or more review criteria are invalid or inactive', 422, 'INVALID_REVIEW_CRITERIA');
    const before = { ...review.toJSON(), scores: review.scores.map(score => score.toJSON()) };
    await review.update({ strengths: input.strengths ?? null, improvementAreas: input.improvementAreas ?? null, comments: input.comments ?? null }, { transaction });
    await PerformanceReviewScore.destroy({ where: { tenantId: auth.tenantId, reviewId: id }, transaction });
    for (const score of input.scores) {
      const evidenceCount = await PerformanceEvidence.count({ where: { tenantId: auth.tenantId, cycleId: review.cycleId, employeeId: review.employeeId, criterionId: score.criterionId, verificationStatus: 'verified' }, transaction });
      await PerformanceReviewScore.create({ tenantId: auth.tenantId, reviewId: id, criterionId: score.criterionId, rawScore: score.rawScore, reviewerComment: score.reviewerComment ?? null, evidenceCount }, { transaction });
    }
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_review_edited', entityType: 'performance_review', entityId: id, beforeData: before, afterData: { ...review.toJSON(), scores: input.scores }, transaction });
    return reviewFor(auth, id, transaction);
  });
}

export async function reopenReviewForCorrection(auth, id, input) {
  if (auth.role !== 'admin') throw new AppError('Only authorized HR administrators can reopen confirmed reviews', 403, 'REVIEW_CORRECTION_DENIED');
  const review = await reviewFor(auth, id);
  if (['completed', 'archived'].includes(review.cycle?.status)) throw new AppError('Completed-cycle reviews require a privileged revision workflow', 409, 'REVIEW_REVISION_REQUIRED');
  return sequelize.transaction(async transaction => {
    const locked = await reviewFor(auth, id, transaction);
    const decision = await PerformanceCalibrationDecision.findOne({ where: { tenantId: auth.tenantId, reviewId: id, status: 'confirmed' }, transaction, lock: transaction.LOCK.UPDATE });
    if (!decision) throw new AppError('Only confirmed reviews can be reopened for correction', 409, 'REVIEW_NOT_CONFIRMED');
    const priorRevisionCount = await PerformanceReviewRevision.count({ where: { tenantId: auth.tenantId, reviewId: id }, transaction });
    const snapshot = { review: locked.toJSON(), scores: locked.scores.map(score => score.toJSON()), calibration: decision.toJSON() };
    const revision = await PerformanceReviewRevision.create({ tenantId: auth.tenantId, reviewId: id, version: priorRevisionCount + 1, reason: input.reason, status: 'original_confirmed', snapshot, createdBy: auth.userId }, { transaction });
    await locked.update({ status: 'draft', overallScore: null, ratingBand: null, submittedAt: null }, { transaction });
    await decision.update({ status: 'correction_required', justification: input.reason, decidedBy: auth.userId, decidedAt: new Date() }, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_review_reopened_for_correction', entityType: 'performance_review', entityId: id, beforeData: snapshot, afterData: { revisionId: revision.id, version: revision.version, reason: input.reason, status: 'draft' }, transaction });
    return reviewFor(auth, id, transaction);
  });
}
