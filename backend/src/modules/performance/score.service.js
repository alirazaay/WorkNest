import { Op } from 'sequelize';
import { Employee, PerformanceCalibrationDecision, PerformanceCriterion, PerformanceCycle, PerformanceReview, PerformanceReviewScore, PerformanceScoreSnapshot, User } from '../../database/models/index.js';
import { findRatingBand } from './rating-bands.service.js';
import { sequelize } from '../../config/database.js';
import { AppError } from '../../middleware/error.js';
import { recordAudit } from '../../services/audit.service.js';
import { assertEmployeeRelease } from './access.js';

const reviewInclude = [{ model: PerformanceReviewScore, as: 'scores', include: [{ model: PerformanceCriterion, as: 'criterion', attributes: ['id', 'name', 'category', 'weight', 'ratingScaleMin', 'ratingScaleMax'] }] }];

export function calculateWeightedScore(scores) {
  if (!scores.length) return { finalScore: 0, totalWeight: 0, lines: [] };
  const totalWeight = scores.reduce((sum, score) => sum + Math.max(0, Number(score.criterion?.weight ?? score.weight ?? 0)), 0);
  const divisor = totalWeight > 0 ? totalWeight : scores.length;
  const lines = scores.map(score => {
    const rawScore = Number(score.rawScore ?? score.raw_score ?? 0);
    const weight = Number(score.criterion?.weight ?? score.weight ?? 0);
    const weightedScore = totalWeight > 0 ? rawScore * weight / divisor : rawScore / divisor;
    return { criterionId: score.criterionId, criterion: score.criterion?.name ?? null, category: score.criterion?.category ?? null, rawScore, weight, weightedScore: Math.round(weightedScore * 1000) / 1000, evidenceCount: Number(score.evidenceCount ?? 0) };
  });
  return { finalScore: Math.round(lines.reduce((sum, line) => sum + line.weightedScore, 0) * 1000) / 1000, totalWeight, lines };
}

export function classifyEvidenceConfidence(coveragePercentage) {
  const coverage = Number(coveragePercentage);
  return coverage >= 80 ? 'high' : coverage >= 50 ? 'moderate' : 'low';
}

async function employeeFor(auth, id) {
  const employee = await Employee.findOne({ where: { id, tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' } } });
  if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  if (auth.role === 'employee' && employee.userId !== auth.userId) throw new AppError('You may only access your own performance score', 403, 'SCORE_ACCESS_DENIED');
  if (auth.role === 'manager') {
    const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] });
    if (!manager?.departmentId || manager.departmentId !== employee.departmentId) throw new AppError('Managers may only access scores for their department', 403, 'SCORE_ACCESS_DENIED');
  }
  return employee;
}

async function cycleFor(auth, id) {
  const cycle = await PerformanceCycle.findOne({ where: { id, tenantId: auth.tenantId } });
  if (!cycle) throw new AppError('Performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
  return cycle;
}

function reviewPriority(review) { return ({ final: 4, manager: 3, self: 2, peer: 1, calibration: 5 })[review.reviewType] ?? 0; }
function chooseReview(reviews) { return [...reviews].sort((a, b) => reviewPriority(b) - reviewPriority(a) || b.id - a.id)[0]; }

export async function getEmployeeScore(auth, cycleId, employeeId) {
  const cycle = await cycleFor(auth, cycleId);
  await employeeFor(auth, employeeId);
  assertEmployeeRelease(auth, cycle);
  const snapshot = await PerformanceScoreSnapshot.findOne({ where: { tenantId: auth.tenantId, cycleId, employeeId }, include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeCode'], include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] }, { model: PerformanceCycle, as: 'cycle', attributes: ['id', 'name', 'year', 'status'] }, { model: User, as: 'generator', attributes: ['id', 'name'] }] });
  if (!snapshot) throw new AppError('Performance score has not been calculated yet', 404, 'PERFORMANCE_SCORE_NOT_FOUND');
  return snapshot;
}

/**
 * Calculate (or force-recalculate) scores for all employees in a cycle.
 *
 * @param {object} auth
 * @param {number} cycleId
 * @param {boolean} [force=false]
 *   When true: existing snapshots for employees are destroyed and recreated.
 *   When false (default): employees with an existing snapshot are skipped (immutable).
 *   Force is not allowed on completed/archived cycles regardless.
 */
export async function calculateCycleScores(auth, cycleId, force = false) {
  const cycle = await cycleFor(auth, cycleId);
  if (['completed', 'archived'].includes(cycle.status)) {
    throw new AppError('Completed or archived cycles cannot be recalculated', 409, 'PERFORMANCE_CYCLE_FROZEN');
  }
  return sequelize.transaction(async transaction => {
    const confirmed = await PerformanceCalibrationDecision.findAll({ where: { tenantId: auth.tenantId, cycleId, status: 'confirmed' }, attributes: ['reviewId'], transaction });
    const confirmedReviewIds = confirmed.map(row => row.reviewId);
    if (!confirmedReviewIds.length) throw new AppError('No confirmed reviews are available for score calculation. Confirm submitted reviews in Calibration first.', 422, 'NO_CONFIRMED_REVIEWS');
    const reviews = await PerformanceReview.findAll({ where: { tenantId: auth.tenantId, cycleId, id: { [Op.in]: confirmedReviewIds }, status: { [Op.in]: ['submitted', 'released'] } }, include: reviewInclude, transaction });
    if (!reviews.length) throw new AppError('The confirmed reviews are no longer available for this cycle.', 422, 'NO_CONFIRMED_REVIEWS');
    const grouped = new Map();
    for (const review of reviews) {
      if (!grouped.has(review.employeeId)) grouped.set(review.employeeId, []);
      grouped.get(review.employeeId).push(review);
    }
    const created = []; const skipped = [];
    for (const [employeeId, employeeReviews] of grouped) {
      const existing = await PerformanceScoreSnapshot.findOne({ where: { tenantId: auth.tenantId, cycleId, employeeId }, transaction, lock: transaction.LOCK.UPDATE });
      if (existing) {
        if (!force) { skipped.push({ employeeId, snapshotId: existing.id, reason: 'immutable_snapshot_exists' }); continue; }
        // Force mode: destroy the existing snapshot so it can be recreated below.
        await existing.destroy({ transaction });
      }
      const review = chooseReview(employeeReviews);
      const calculation = calculateWeightedScore(review.scores);
      if (!calculation.totalWeight) throw new AppError('The confirmed review has no usable criterion weights. Complete the cycle template before calculating scores.', 422, 'INVALID_SCORE_WEIGHTS');
      const band = await findRatingBand(auth.tenantId, calculation.finalScore, transaction);
      const evidenceCoveragePercentage = calculation.lines.length
        ? Math.round((calculation.lines.filter(line => Number(line.evidenceCount) > 0).length / calculation.lines.length) * 10000) / 100
        : 0;
      const evidenceConfidence = classifyEvidenceConfidence(evidenceCoveragePercentage);
      const snapshot = await PerformanceScoreSnapshot.create({
        tenantId: auth.tenantId, cycleId, employeeId,
        finalScore: calculation.finalScore, ratingBand: band?.name ?? null,
        evidenceCoveragePercentage, evidenceConfidence,
        calculationDetails: { version: 1, sourceReviewId: review.id, sourceReviewType: review.reviewType, totalWeight: calculation.totalWeight, ratingBandId: band?.id ?? null, ratingBandName: band?.name ?? null, evidenceCoveragePercentage, evidenceConfidence, lines: calculation.lines, generatedAt: new Date().toISOString(), forcedRecalculation: force },
        generatedBy: auth.userId, generatedAt: new Date()
      }, { transaction });

      // Batch update weighted scores for all score lines in parallel (eliminates N+1).
      await Promise.all(
        calculation.lines.map(line => {
          const scoreRow = review.scores.find(score => score.criterionId === line.criterionId);
          return scoreRow ? scoreRow.update({ weightedScore: line.weightedScore }, { transaction }) : Promise.resolve();
        })
      );
      await review.update({ overallScore: calculation.finalScore }, { transaction });
      await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: force ? 'performance_score_force_recalculated' : 'performance_score_calculated', entityType: 'performance_score_snapshot', entityId: snapshot.id, afterData: { cycleId, employeeId, finalScore: calculation.finalScore, sourceReviewId: review.id, forced: force }, transaction });
      created.push(snapshot);
    }
    return { cycleId, created, skipped, reviewCount: reviews.length, forced: force };
  });
}
