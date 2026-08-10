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
