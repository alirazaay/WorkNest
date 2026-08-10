import { Op } from 'sequelize';
import { Employee, EmployeePromotionAssessment, PerformanceAppraisalExplanation, PerformanceCycle, PerformanceEquivalenceGroup, PerformanceEquivalenceMember, PerformanceReview, PerformanceReviewScore, PerformanceScoreSnapshot, PerformanceSignature, PromotionProfile, User } from '../../database/models/index.js';
import { sequelize } from '../../config/database.js';
import { AppError } from '../../middleware/error.js';
import { recordAudit } from '../../services/audit.service.js';

const priority = { calibration: 5, final: 4, manager: 3, self: 2, peer: 1 };
const employeeInclude = [{ model: Employee, as: 'employee', attributes: ['id', 'employeeCode', 'designation', 'departmentId'], include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] }, { model: PerformanceCycle, as: 'cycle', attributes: ['id', 'name', 'year', 'status'] }, { model: User, as: 'generator', attributes: ['id', 'name'] }];

export function buildPerformanceExplanation({ snapshot, review, evidenceCoverage, signature, equivalenceGroup, promotionAssessment, promotionProfile }) {
  const score = Number(snapshot.finalScore).toFixed(3); const band = snapshot.ratingBand || 'unassigned rating band';
  const performanceConclusion = `Annual performance is ${score} points and is classified as ${band}. The result is based on the stored criterion-level score breakdown and supporting evidence coverage of ${Number(evidenceCoverage).toFixed(2)}%.`;
  let equivalenceConclusion = null;
  if (equivalenceGroup?.members?.length > 1) { const scores = equivalenceGroup.members.map(member => Number(member.finalScore)); equivalenceConclusion = `Performance is considered equivalent to ${scores.length - 1} other employee(s) because the group spread is ${(Math.max(...scores) - Math.min(...scores)).toFixed(3)} points, within the configured threshold of ${Number(equivalenceGroup.thresholdUsed).toFixed(3)}.`; }
  let promotionConclusion = null;
  if (promotionAssessment) promotionConclusion = `Promotion readiness for ${promotionProfile?.targetRole || 'the configured target role'} is ${Number(promotionAssessment.readinessScore).toFixed(2)}% (${promotionAssessment.recommendation}). This recommendation is based on the separate readiness assessment and does not mean annual performance was higher or lower.`;
  return { finalScore: Number(snapshot.finalScore), ratingBand: snapshot.ratingBand, performanceConclusion, promotionConclusion, criterionBreakdown: snapshot.calculationDetails?.lines || [], evidenceCoveragePercentage: Number(evidenceCoverage), equivalenceConclusion, performanceSignature: signature?.signatureName ?? null, explanationSnapshot: { version: 1, sourceSnapshotId: snapshot.id, sourceReviewId: review?.id ?? null, sourceSignatureId: signature?.id ?? null, sourcePromotionAssessmentId: promotionAssessment?.id ?? null, generatedAt: new Date().toISOString() } };
}

async function employeeFor(auth, id) {
  const employee = await Employee.findOne({ where: { id, tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' } } });
  if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  if (auth.role === 'employee' && employee.userId !== auth.userId) throw new AppError('You may only access your own appraisal explanation', 403, 'EXPLANATION_ACCESS_DENIED');
  if (auth.role === 'manager') { const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] }); if (!manager?.departmentId || manager.departmentId !== employee.departmentId) throw new AppError('Managers may only access explanations for their department', 403, 'EXPLANATION_ACCESS_DENIED'); }
  return employee;
}

async function sourceData(auth, cycleId, employeeId) {
  const snapshot = await PerformanceScoreSnapshot.findOne({ where: { tenantId: auth.tenantId, cycleId, employeeId } });
  if (!snapshot) throw new AppError('Performance score has not been calculated yet', 404, 'PERFORMANCE_SCORE_NOT_FOUND');
  const reviews = await PerformanceReview.findAll({ where: { tenantId: auth.tenantId, cycleId, employeeId, status: { [Op.in]: ['submitted', 'released'] } }, include: [{ model: PerformanceReviewScore, as: 'scores' }] }); const review = reviews.sort((a, b) => (priority[b.reviewType] || 0) - (priority[a.reviewType] || 0))[0] ?? null;
  const evidenceCoverage = review?.scores?.length ? (review.scores.filter(score => Number(score.evidenceCount) > 0).length / review.scores.length) * 100 : 0;
  const signature = await PerformanceSignature.findOne({ where: { tenantId: auth.tenantId, cycleId, employeeId } });
  const promotionAssessment = await EmployeePromotionAssessment.findOne({ where: { tenantId: auth.tenantId, cycleId, employeeId }, order: [['created_at', 'DESC']] });
  const promotionProfile = promotionAssessment ? await PromotionProfile.findOne({ where: { id: promotionAssessment.promotionProfileId, tenantId: auth.tenantId }, attributes: ['id', 'targetRole'] }) : null;
  const groups = await PerformanceEquivalenceGroup.findAll({ where: { tenantId: auth.tenantId, cycleId }, include: [{ model: PerformanceEquivalenceMember, as: 'members' }] }); const equivalenceGroup = groups.find(group => group.members.some(member => member.employeeId === employeeId)) ?? null;
  return { snapshot, review, evidenceCoverage, signature, equivalenceGroup, promotionAssessment, promotionProfile };
}

export async function getAppraisalExplanation(auth, cycleId, employeeId) { await employeeFor(auth, employeeId); const explanation = await PerformanceAppraisalExplanation.findOne({ where: { tenantId: auth.tenantId, cycleId, employeeId }, include: employeeInclude }); if (!explanation) throw new AppError('Appraisal explanation has not been generated yet', 404, 'APPRAISAL_EXPLANATION_NOT_FOUND'); return explanation; }

export async function generateCycleExplanations(auth, cycleId) {
  const cycle = await PerformanceCycle.findOne({ where: { id: cycleId, tenantId: auth.tenantId } }); if (!cycle) throw new AppError('Performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
  return sequelize.transaction(async transaction => {
    const snapshots = await PerformanceScoreSnapshot.findAll({ where: { tenantId: auth.tenantId, cycleId }, transaction }); const created = []; const skipped = [];
    for (const snapshot of snapshots) {
      const existing = await PerformanceAppraisalExplanation.findOne({ where: { tenantId: auth.tenantId, cycleId, employeeId: snapshot.employeeId }, transaction, lock: transaction.LOCK.UPDATE }); if (existing) { skipped.push({ employeeId: snapshot.employeeId, explanationId: existing.id }); continue; }
      const data = await sourceData(auth, cycleId, snapshot.employeeId); const explanation = buildPerformanceExplanation({ snapshot, ...data }); const row = await PerformanceAppraisalExplanation.create({ tenantId: auth.tenantId, cycleId, employeeId: snapshot.employeeId, ...explanation, generatedBy: auth.userId, generatedAt: new Date() }, { transaction });
      await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_appraisal_explanation_generated', entityType: 'performance_appraisal_explanation', entityId: row.id, afterData: { cycleId, employeeId: snapshot.employeeId, sourceSnapshotId: snapshot.id }, transaction }); created.push(row);
    }
    return { cycleId, snapshotCount: snapshots.length, created, skipped };
  });
}
