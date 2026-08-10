import { Op } from 'sequelize';
import { Employee, EmployeePromotionAssessment, PerformanceCycle, PromotionProfile, PromotionReadinessCriterion, User } from '../../database/models/index.js';
import { sequelize } from '../../config/database.js';
import { AppError } from '../../middleware/error.js';
import { recordAudit } from '../../services/audit.service.js';

const profileInclude = [{ model: PromotionReadinessCriterion, as: 'criteria', order: [['id', 'ASC']] }, { model: User, as: 'creator', attributes: ['id', 'name'] }];
const assessmentInclude = [{ model: Employee, as: 'employee', attributes: ['id', 'employeeCode', 'departmentId'], include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] }, { model: PerformanceCycle, as: 'cycle', attributes: ['id', 'name', 'year', 'status'] }, { model: PromotionProfile, as: 'profile', include: [{ model: PromotionReadinessCriterion, as: 'criteria' }] }, { model: User, as: 'assessor', attributes: ['id', 'name'] }];

export function calculateReadinessScore(criteria, scores) {
  const scoreMap = new Map(scores.map(row => [Number(row.criterionId), Number(row.score)]));
  const lines = criteria.map(criterion => ({ criterionId: criterion.id, criterionName: criterion.criterionName, requiredLevel: criterion.requiredLevel, weight: Number(criterion.weight), score: scoreMap.get(criterion.id) ?? 0, weightedScore: Math.round((Number(criterion.weight) * (scoreMap.get(criterion.id) ?? 0) / 100) * 1000) / 1000 }));
  const readinessScore = Math.round(lines.reduce((sum, line) => sum + line.weightedScore, 0) * 1000) / 1000;
  const recommendation = readinessScore >= 80 ? 'ready' : readinessScore >= 60 ? 'developing' : 'not_ready';
  return { readinessScore, recommendation, lines };
}

function assertWeights(criteria) { const total = criteria.reduce((sum, row) => sum + Number(row.weight), 0); if (Math.abs(total - 100) > 0.001) throw new AppError(`Promotion readiness weights must total 100%. Current total: ${total}%`, 422, 'PROMOTION_WEIGHTS_NOT_100'); }

export async function listPromotionProfiles(auth) { return PromotionProfile.findAll({ where: { tenantId: auth.tenantId }, include: profileInclude, order: [['name', 'ASC']] }); }

export async function createPromotionProfile(auth, input) {
  assertWeights(input.criteria);
  return sequelize.transaction(async transaction => {
    const profile = await PromotionProfile.create({ tenantId: auth.tenantId, createdBy: auth.userId, name: input.name, targetRole: input.targetRole, description: input.description ?? null }, { transaction });
    await PromotionReadinessCriterion.bulkCreate(input.criteria.map(row => ({ tenantId: auth.tenantId, profileId: profile.id, ...row })), { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'promotion_profile_created', entityType: 'promotion_profile', entityId: profile.id, afterData: { ...profile.toJSON(), criteria: input.criteria }, transaction });
    return PromotionProfile.findOne({ where: { id: profile.id, tenantId: auth.tenantId }, include: profileInclude, transaction });
  });
}

export async function updatePromotionProfile(auth, id, input) {
  const profile = await PromotionProfile.findOne({ where: { id, tenantId: auth.tenantId } });
  if (!profile) throw new AppError('Promotion profile not found', 404, 'PROMOTION_PROFILE_NOT_FOUND');
  const before = profile.toJSON(); await profile.update(input);
  await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'promotion_profile_updated', entityType: 'promotion_profile', entityId: id, beforeData: before, afterData: profile.toJSON() });
  return PromotionProfile.findOne({ where: { id, tenantId: auth.tenantId }, include: profileInclude });
}

async function employeeFor(auth, id) {
  const employee = await Employee.findOne({ where: { id, tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' } } });
  if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  if (auth.role === 'employee' && employee.userId !== auth.userId) throw new AppError('You may only access your own promotion readiness', 403, 'PROMOTION_ACCESS_DENIED');
  if (auth.role === 'manager') {
    const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] });
    if (!manager?.departmentId || manager.departmentId !== employee.departmentId) throw new AppError('Managers may only assess employees in their department', 403, 'PROMOTION_ACCESS_DENIED');
  }
  return employee;
}

export async function createPromotionAssessment(auth, input) {
  if (auth.role === 'employee') throw new AppError('Employees cannot create promotion assessments', 403, 'PROMOTION_ASSESSMENT_DENIED');
  await employeeFor(auth, input.employeeId);
  const cycle = await PerformanceCycle.findOne({ where: { id: input.cycleId, tenantId: auth.tenantId } });
  if (!cycle) throw new AppError('Performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
  const profile = await PromotionProfile.findOne({ where: { id: input.promotionProfileId, tenantId: auth.tenantId, isActive: true }, include: [{ model: PromotionReadinessCriterion, as: 'criteria' }] });
  if (!profile) throw new AppError('Active promotion profile not found', 404, 'PROMOTION_PROFILE_NOT_FOUND');
  assertWeights(profile.criteria);
  const expected = new Set(profile.criteria.map(row => row.id)); const provided = new Set(input.scores.map(row => Number(row.criterionId)));
  if (expected.size !== provided.size || [...expected].some(id => !provided.has(id))) throw new AppError('A score is required for every promotion readiness criterion', 422, 'INCOMPLETE_PROMOTION_ASSESSMENT');
  const result = calculateReadinessScore(profile.criteria, input.scores);
  return sequelize.transaction(async transaction => {
    const existing = await EmployeePromotionAssessment.findOne({ where: { tenantId: auth.tenantId, cycleId: input.cycleId, employeeId: input.employeeId, promotionProfileId: input.promotionProfileId }, transaction });
    if (existing) throw new AppError('A promotion assessment already exists for this employee and profile', 409, 'PROMOTION_ASSESSMENT_EXISTS');
    const assessment = await EmployeePromotionAssessment.create({ tenantId: auth.tenantId, cycleId: input.cycleId, employeeId: input.employeeId, promotionProfileId: input.promotionProfileId, readinessScore: result.readinessScore, recommendation: result.recommendation, assessedBy: auth.userId, comments: input.comments ?? null, assessmentSnapshot: { version: 1, profile: { id: profile.id, name: profile.name, targetRole: profile.targetRole }, lines: result.lines, generatedAt: new Date().toISOString() } }, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'promotion_readiness_assessed', entityType: 'employee_promotion_assessment', entityId: assessment.id, afterData: { cycleId: input.cycleId, employeeId: input.employeeId, promotionProfileId: input.promotionProfileId, readinessScore: result.readinessScore, recommendation: result.recommendation }, transaction });
    return EmployeePromotionAssessment.findOne({ where: { id: assessment.id, tenantId: auth.tenantId }, include: assessmentInclude, transaction });
  });
}

export async function getEmployeePromotionReadiness(auth, employeeId, query = {}) {
  await employeeFor(auth, employeeId);
  const cycleWhere = { tenantId: auth.tenantId, ...(query.cycleId ? { id: query.cycleId } : {}) };
  const cycles = await PerformanceCycle.findAll({ where: auth.role === 'employee' ? { ...cycleWhere, status: { [Op.in]: ['completed', 'archived'] } } : cycleWhere, attributes: ['id', 'status'] });
  return EmployeePromotionAssessment.findAll({ where: { tenantId: auth.tenantId, employeeId, cycleId: { [Op.in]: cycles.map(cycle => cycle.id) }, ...(query.promotionProfileId ? { promotionProfileId: query.promotionProfileId } : {}) }, include: assessmentInclude, order: [['created_at', 'DESC']] });
}
