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
