import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const cycleType = z.enum(['annual', 'semi_annual', 'quarterly', 'probation']);
export const performanceCycleCreateSchema = z.object({
  name: z.string().min(3).max(180),
  cycleType: cycleType.default('annual'),
  year: z.coerce.number().int().min(2000).max(2200),
  startDate: date,
  endDate: date,
  goalSettingStart: date.optional().nullable(),
  goalSettingEnd: date.optional().nullable(),
  reviewStart: date.optional().nullable(),
  reviewEnd: date.optional().nullable()
});
export const performanceCycleUpdateSchema = performanceCycleCreateSchema.partial().extend({ status: z.enum(['draft', 'active', 'review', 'calibration', 'completed', 'archived']).optional() });
export const performanceCycleQuerySchema = z.object({ status: z.enum(['draft', 'active', 'review', 'calibration', 'completed', 'archived']).optional(), year: z.coerce.number().int().min(2000).max(2200).optional(), cycleType: cycleType.optional() });
const weight = z.coerce.number().min(0).max(100);
export const performanceCriterionCreateSchema = z.object({ name: z.string().min(2).max(150), description: z.string().max(2000).optional().nullable(), category: z.string().min(2).max(80), weight: weight.default(0), ratingScaleMin: z.coerce.number().min(0).max(100).default(0), ratingScaleMax: z.coerce.number().positive().max(100).default(5), evidenceRequired: z.boolean().default(true) });
export const performanceCriterionUpdateSchema = performanceCriterionCreateSchema.partial().extend({ isActive: z.boolean().optional() });
export const performanceTemplateCreateSchema = z.object({ name: z.string().min(3).max(180), jobRole: z.string().max(150).optional().nullable(), description: z.string().max(2000).optional().nullable(), ratingScaleMin: z.coerce.number().min(0).max(100).default(0), ratingScaleMax: z.coerce.number().positive().max(100).default(5) });
export const performanceTemplateUpdateSchema = performanceTemplateCreateSchema.partial().extend({ status: z.enum(['draft', 'active', 'archived']).optional() });
export const templateCriterionSchema = z.object({ criterionId: z.coerce.number().int().positive(), weight, ratingScaleMin: z.coerce.number().min(0).max(100).optional().nullable(), ratingScaleMax: z.coerce.number().positive().max(100).optional().nullable(), evidenceRequired: z.boolean().optional(), sortOrder: z.coerce.number().int().min(0).default(0) });
export const templateCriterionUpdateSchema = templateCriterionSchema.partial();
const goalStatuses = ['not_started', 'in_progress', 'completed', 'partially_completed', 'cancelled'];
const goalTypes = ['kpi', 'objective', 'development', 'project'];
export const performanceGoalCreateSchema = z.object({ cycleId: z.coerce.number().int().positive(), employeeId: z.coerce.number().int().positive(), title: z.string().min(3).max(180), description: z.string().max(2000).optional().nullable(), goalType: z.enum(goalTypes).default('kpi'), targetValue: z.string().max(100).optional().nullable(), actualValue: z.string().max(100).optional().nullable(), unit: z.string().max(50).optional().nullable(), weight: weight.default(0), dueDate: date.optional().nullable(), status: z.enum(goalStatuses).default('not_started'), progressPercentage: z.coerce.number().min(0).max(100).default(0), managerId: z.coerce.number().int().positive().optional().nullable() });
export const performanceGoalUpdateSchema = performanceGoalCreateSchema.omit({ cycleId: true, employeeId: true, managerId: true }).partial();
export const performanceGoalQuerySchema = z.object({ cycleId: z.coerce.number().int().positive().optional(), employeeId: z.coerce.number().int().positive().optional(), status: z.enum(goalStatuses).optional() });
const evidenceTypes = ['kpi_result', 'project_completion', 'customer_feedback', 'peer_recognition', 'manager_observation', 'certification', 'innovation', 'cost_saving', 'revenue_contribution', 'process_improvement', 'mentorship', 'training_completion', 'quality_metric'];
const evidenceSourceTypes = ['manual', 'goal', 'attendance', 'project', 'customer', 'learning', 'other'];
export const performanceEvidenceCreateSchema = z.object({ cycleId: z.coerce.number().int().positive(), employeeId: z.coerce.number().int().positive(), goalId: z.coerce.number().int().positive().optional().nullable(), criterionId: z.coerce.number().int().positive().optional().nullable(), evidenceType: z.enum(evidenceTypes), title: z.string().min(3).max(180), description: z.string().max(3000).optional().nullable(), metricValue: z.string().max(100).optional().nullable(), sourceType: z.enum(evidenceSourceTypes).default('manual'), sourceId: z.coerce.number().int().positive().optional().nullable(), eventDate: date });
export const performanceEvidenceQuerySchema = z.object({ cycleId: z.coerce.number().int().positive().optional(), employeeId: z.coerce.number().int().positive().optional(), goalId: z.coerce.number().int().positive().optional(), criterionId: z.coerce.number().int().positive().optional(), verificationStatus: z.enum(['pending', 'verified', 'rejected']).optional() });
export const performanceEvidenceVerifySchema = z.object({ verificationStatus: z.enum(['verified', 'rejected']) });
const reviewTypes = ['self', 'manager', 'peer', 'calibration', 'final'];
const reviewStatuses = ['draft', 'in_progress', 'submitted', 'released'];
const reviewScoreSchema = z.object({ criterionId: z.coerce.number().int().positive(), rawScore: z.coerce.number().min(0).max(100), reviewerComment: z.string().max(3000).optional().nullable() });
export const performanceReviewCreateSchema = z.object({ cycleId: z.coerce.number().int().positive(), employeeId: z.coerce.number().int().positive(), reviewType: z.enum(reviewTypes), strengths: z.string().max(5000).optional().nullable(), improvementAreas: z.string().max(5000).optional().nullable(), comments: z.string().max(5000).optional().nullable(), scores: z.array(reviewScoreSchema).min(1).max(100) }).superRefine((value, ctx) => { const ids = value.scores.map(score => score.criterionId); if (new Set(ids).size !== ids.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scores'], message: 'Each criterion may only be scored once per review' }); });
export const performanceReviewQuerySchema = z.object({ cycleId: z.coerce.number().int().positive().optional(), employeeId: z.coerce.number().int().positive().optional(), reviewerId: z.coerce.number().int().positive().optional(), reviewType: z.enum(reviewTypes).optional(), status: z.enum(reviewStatuses).optional() });
export const performanceScoreQuerySchema = z.object({ cycleId: z.coerce.number().int().positive() });
const performanceRatingBandFields = z.object({ name: z.string().min(2).max(100), minScore: z.coerce.number().min(0).max(100), maxScore: z.coerce.number().min(0).max(100), description: z.string().max(1000).optional().nullable(), sortOrder: z.coerce.number().int().min(0).default(0) });
export const performanceRatingBandCreateSchema = performanceRatingBandFields.superRefine((value, ctx) => { if (value.minScore >= value.maxScore) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maxScore'], message: 'Maximum score must be greater than minimum score' }); });
export const performanceRatingBandUpdateSchema = performanceRatingBandFields.partial().extend({ isActive: z.boolean().optional() });
export const performanceEquivalenceSettingsSchema = z.object({ threshold: z.coerce.number().min(0).max(10), strictRanking: z.boolean().optional() });
export const performanceEquivalenceQuerySchema = z.object({ cycleId: z.coerce.number().int().positive().optional() });
export const performanceSignatureRuleCreateSchema = z.object({ name: z.string().min(2).max(100), description: z.string().max(1000).optional().nullable(), categories: z.array(z.string().min(2).max(80)).min(1).max(20), sortOrder: z.coerce.number().int().min(0).default(0) });
export const performanceSignatureRuleUpdateSchema = performanceSignatureRuleCreateSchema.partial().extend({ isActive: z.boolean().optional() });
export const performanceSignatureQuerySchema = z.object({ cycleId: z.coerce.number().int().positive() });
const promotionCriterionSchema = z.object({ criterionName: z.string().min(2).max(120), weight: z.coerce.number().min(0).max(100), requiredLevel: z.string().max(80).optional().nullable() });
export const promotionProfileCreateSchema = z.object({ name: z.string().min(3).max(150), targetRole: z.string().min(2).max(150), description: z.string().max(2000).optional().nullable(), criteria: z.array(promotionCriterionSchema).min(1).max(50) });
export const promotionProfileUpdateSchema = z.object({ name: z.string().min(3).max(150).optional(), targetRole: z.string().min(2).max(150).optional(), description: z.string().max(2000).optional().nullable(), isActive: z.boolean().optional() });
export const promotionAssessmentCreateSchema = z.object({ cycleId: z.coerce.number().int().positive(), employeeId: z.coerce.number().int().positive(), promotionProfileId: z.coerce.number().int().positive(), scores: z.array(z.object({ criterionId: z.coerce.number().int().positive(), score: z.coerce.number().min(0).max(100) })).min(1).max(50), comments: z.string().max(3000).optional().nullable() }).superRefine((value, ctx) => { const ids = value.scores.map(row => row.criterionId); if (new Set(ids).size !== ids.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scores'], message: 'Each promotion criterion may only be scored once' }); });
export const promotionReadinessQuerySchema = z.object({ cycleId: z.coerce.number().int().positive().optional(), promotionProfileId: z.coerce.number().int().positive().optional() });
const rewardTypes = ['salary_increment', 'performance_bonus', 'promotion', 'recognition', 'development_opportunity'];
export const performanceRewardCreateSchema = z.object({ cycleId: z.coerce.number().int().positive(), employeeId: z.coerce.number().int().positive(), rewardType: z.enum(rewardTypes), recommendedValue: z.coerce.number().min(0), reason: z.string().min(5).max(3000) });
export const performanceRewardQuerySchema = z.object({ cycleId: z.coerce.number().int().positive().optional(), employeeId: z.coerce.number().int().positive().optional(), rewardType: z.enum(rewardTypes).optional(), status: z.enum(['recommended', 'approved', 'rejected']).optional() });
export const performanceRewardApproveSchema = z.object({ approvedValue: z.coerce.number().min(0).optional(), approvalReason: z.string().max(2000).optional().nullable() });
export const performanceRewardRejectSchema = z.object({ reason: z.string().min(5).max(2000) });
export const performanceCalibrationQuerySchema = z.object({ cycleId: z.coerce.number().int().positive().optional() });
export const performanceCalibrationActionSchema = z.object({ action: z.enum(['confirm', 'request_clarification']), justification: z.string().max(3000).optional().nullable() }).superRefine((value, ctx) => { if (value.action === 'request_clarification' && !value.justification?.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['justification'], message: 'Clarification requests require a reason' }); });
export const performanceCalibrationOverrideSchema = z.object({ newScore: z.coerce.number().min(0).max(100).optional(), newRatingBand: z.string().min(2).max(100), justification: z.string().min(10).max(3000) });
export const performanceCalibrationSettingsSchema = z.object({ blindReviewEnabled: z.boolean() });
export const performanceCalibrationRevealQuerySchema = z.object({ revealIdentity: z.coerce.boolean().optional().default(false) });
export const performanceExplanationQuerySchema = z.object({ cycleId: z.coerce.number().int().positive() });
export const performanceTransparencyQuerySchema = z.object({ cycleId: z.coerce.number().int().positive().optional() });
export const performanceAuditQuerySchema = z.object({ limit: z.coerce.number().int().positive().max(100).optional() });
export const performanceFairnessQuerySchema = z.object({ status: z.enum(['open', 'acknowledged', 'resolved']).optional(), severity: z.enum(['info', 'warning', 'error']).optional() });
export const performanceFairnessResolveSchema = z.object({ status: z.enum(['acknowledged', 'resolved']), resolutionNote: z.string().min(5).max(2000) });
