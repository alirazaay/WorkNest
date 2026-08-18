import { Op } from 'sequelize';
import { Department, Employee, PerformanceCalibrationDecision, PerformanceCalibrationSetting, PerformanceEquivalenceGroup, PerformanceEquivalenceMember, PerformanceReview, PerformanceReviewScore, PerformanceScoreSnapshot, PerformanceCycle, PerformanceCriterion, User } from '../../database/models/index.js';
import { sequelize } from '../../config/database.js';
import { AppError } from '../../middleware/error.js';
import { recordAudit } from '../../services/audit.service.js';
import { createNotification } from '../../services/notification.service.js';

const reviewInclude = [{ model: Employee, as: 'employee', attributes: ['id', 'userId', 'employeeCode', 'designation', 'departmentId'], include: [{ model: User, as: 'user', attributes: ['id', 'name'] }, { model: Department, as: 'department', attributes: ['id', 'name'] }] }, { model: PerformanceCycle, as: 'cycle', attributes: ['id', 'name', 'year', 'status'] }, { model: PerformanceReviewScore, as: 'scores', include: [{ model: PerformanceCriterion, as: 'criterion', attributes: ['id', 'name', 'category', 'weight'] }] }];

export async function getCalibrationSettings(auth) { return (await PerformanceCalibrationSetting.findOne({ where: { tenantId: auth.tenantId } })) ?? { tenantId: auth.tenantId, blindReviewEnabled: false, isDefault: true }; }

export async function updateCalibrationSettings(auth, input) {
  const before = await getCalibrationSettings(auth); const [settings] = await PerformanceCalibrationSetting.findOrCreate({ where: { tenantId: auth.tenantId }, defaults: { tenantId: auth.tenantId, blindReviewEnabled: input.blindReviewEnabled, updatedBy: auth.userId } });
  await settings.update({ blindReviewEnabled: input.blindReviewEnabled, updatedBy: auth.userId });
  await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_calibration_settings_updated', entityType: 'performance_calibration_setting', entityId: settings.id, beforeData: before, afterData: settings.toJSON() });
  return settings;
}

function blindItem(item, labelIndex) {
  const review = item.review.toJSON(); const employee = review.employee; review.employeeId = null; review.employee = { id: null, employeeCode: null, designation: employee.designation, departmentId: employee.departmentId, department: employee.department, user: { id: null, name: `Employee ${labelIndex}` } };
  const scoreSnapshot = item.scoreSnapshot?.toJSON?.() ?? item.scoreSnapshot; if (scoreSnapshot) { delete scoreSnapshot.employeeId; }
  const group = item.equivalenceGroup?.toJSON?.() ?? item.equivalenceGroup; if (group) { group.members = (item.equivalenceGroup.members || []).map((member, index) => ({ finalScore: member.finalScore, employee: { name: `Employee ${index + 1}` } })); }
  return { ...item, review, scoreSnapshot, equivalenceGroup: group, identityHidden: true };
}

async function reviewFor(auth, id, transaction) {
  const review = await PerformanceReview.findOne({ where: { id, tenantId: auth.tenantId }, include: reviewInclude, transaction });
  if (!review) throw new AppError('Performance review not found', 404, 'PERFORMANCE_REVIEW_NOT_FOUND');
  if (auth.role === 'manager') {
    const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'], transaction });
    if (!manager?.departmentId || manager.departmentId !== review.employee.departmentId) throw new AppError('Managers may only calibrate their department', 403, 'CALIBRATION_ACCESS_DENIED');
  }
  return review;
}

export async function listCalibration(auth, cycleId, revealIdentity = false) {
  const where = { tenantId: auth.tenantId, ...(cycleId ? { cycleId } : {}), status: { [Op.in]: ['submitted', 'released'] } };
  if (auth.role === 'manager') {
    const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] });
    if (!manager?.departmentId) throw new AppError('Manager is not assigned to a department', 403, 'NO_MANAGER_DEPARTMENT');
    const employees = await Employee.findAll({ where: { tenantId: auth.tenantId, departmentId: manager.departmentId }, attributes: ['id'] }); where.employeeId = { [Op.in]: employees.map(row => row.id) };
  }
  const [reviews, snapshots, decisions, groups] = await Promise.all([
    PerformanceReview.findAll({ where, include: reviewInclude, order: [['created_at', 'DESC']] }),
    PerformanceScoreSnapshot.findAll({ where: { tenantId: auth.tenantId, ...(cycleId ? { cycleId } : {}) } }),
    PerformanceCalibrationDecision.findAll({ where: { tenantId: auth.tenantId, ...(cycleId ? { cycleId } : {}) } }),
    PerformanceEquivalenceGroup.findAll({ where: { tenantId: auth.tenantId, ...(cycleId ? { cycleId } : {}) }, include: [{ model: PerformanceEquivalenceMember, as: 'members' }] }),
  ]);
  const snapshotMap = new Map(snapshots.map(row => [`${row.cycleId}:${row.employeeId}`, row])); const decisionMap = new Map(decisions.map(row => [row.reviewId, row])); const groupMap = new Map(); for (const group of groups) for (const member of group.members) groupMap.set(`${group.cycleId}:${member.employeeId}`, group);
  const settings = await getCalibrationSettings(auth); const items = reviews.map(review => { const snapshot = snapshotMap.get(`${review.cycleId}:${review.employeeId}`); const evidenceTotal = review.scores.length; const covered = review.scores.filter(score => Number(score.evidenceCount) > 0).length; return { review, scoreSnapshot: snapshot, evidenceCoveragePercentage: evidenceTotal ? Math.round((covered / evidenceTotal) * 10000) / 100 : 0, equivalenceGroup: groupMap.get(`${review.cycleId}:${review.employeeId}`) ?? null, calibrationDecision: decisionMap.get(review.id) ?? null }; });
  return settings.blindReviewEnabled && !(auth.role === 'admin' && revealIdentity) ? items.map((item, index) => blindItem(item, index + 1)) : items.map(item => ({ ...item, identityHidden: false }));
}

export async function calibrateReview(auth, id, input) {
  const review = await reviewFor(auth, id); if (review.status !== 'submitted' && review.status !== 'released') throw new AppError('Only submitted reviews can enter calibration', 409, 'CALIBRATION_STATUS_INVALID');
  return sequelize.transaction(async transaction => {
    const previous = await PerformanceCalibrationDecision.findOne({ where: { tenantId: auth.tenantId, reviewId: id }, transaction });
    if (previous?.status === 'overridden') throw new AppError('An overridden review cannot be calibrated again', 409, 'CALIBRATION_ALREADY_OVERRIDDEN');
    const values = { tenantId: auth.tenantId, cycleId: review.cycleId, reviewId: id, employeeId: review.employeeId, status: input.action === 'confirm' ? 'confirmed' : 'clarification_requested', previousScore: review.overallScore, newScore: review.overallScore, previousRatingBand: review.ratingBand, newRatingBand: review.ratingBand, justification: input.justification ?? null, decidedBy: auth.userId, decidedAt: new Date() };
    const decision = previous ? await previous.update(values, { transaction }) : await PerformanceCalibrationDecision.create(values, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: `performance_calibration_${values.status}`, entityType: 'performance_review', entityId: id, beforeData: previous?.toJSON() ?? null, afterData: decision.toJSON(), transaction });
    await notifyCalibrationDecision(auth, review, values.status, transaction);
    return decision;
  });
}

export async function overrideReview(auth, id, input) {
  const review = await reviewFor(auth, id); if (review.status !== 'submitted' && review.status !== 'released') throw new AppError('Only submitted reviews can be overridden', 409, 'CALIBRATION_STATUS_INVALID');
  return sequelize.transaction(async transaction => {
    const beforeReview = review.toJSON(); const previous = await PerformanceCalibrationDecision.findOne({ where: { tenantId: auth.tenantId, reviewId: id }, transaction });
    const nextScore = input.newScore ?? review.overallScore; await review.update({ overallScore: nextScore, ratingBand: input.newRatingBand }, { transaction });
    const values = { tenantId: auth.tenantId, cycleId: review.cycleId, reviewId: id, employeeId: review.employeeId, status: 'overridden', previousScore: beforeReview.overallScore, newScore: nextScore, previousRatingBand: beforeReview.ratingBand, newRatingBand: input.newRatingBand, justification: input.justification, decidedBy: auth.userId, decidedAt: new Date() };
    const decision = previous ? await previous.update(values, { transaction }) : await PerformanceCalibrationDecision.create(values, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_calibration_override', entityType: 'performance_review', entityId: id, beforeData: { review: beforeReview, decision: previous?.toJSON() ?? null }, afterData: { review: review.toJSON(), decision: decision.toJSON() }, transaction });
    await notifyCalibrationOverride(auth, review, transaction);
    return decision;
  });
}

async function notifyCalibrationDecision(auth, review, status, transaction) {
  if (status !== 'clarification_requested' || !review.employee?.userId) return;
  await createNotification({ tenantId: auth.tenantId, userId: review.employee.userId, type: 'performance_clarification_requested', title: 'Clarification requested for your performance review', message: 'HR requested clarification during performance calibration. Please contact your manager or HR team.', entityType: 'performance_review', entityId: review.id, transaction });
}

async function notifyCalibrationOverride(auth, review, transaction) {
  if (!review.employee?.userId) return;
  await createNotification({ tenantId: auth.tenantId, userId: review.employee.userId, type: 'performance_rating_updated', title: 'Your performance rating was updated', message: 'Your performance rating was updated during calibration. The finalized appraisal will be available when released.', entityType: 'performance_review', entityId: review.id, transaction });
}


