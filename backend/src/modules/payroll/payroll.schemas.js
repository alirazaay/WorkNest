import { z } from 'zod';

const period = z.object({ month: z.coerce.number().int().min(1).max(12), year: z.coerce.number().int().min(2000).max(2200) });
export const payrollPeriodSchema = period;
export const payrollRunQuerySchema = z.object({ month: z.coerce.number().int().min(1).max(12).optional(), year: z.coerce.number().int().min(2000).max(2200).optional(), status: z.enum(['processing', 'generated', 'approved', 'locked', 'failed']).optional(), page: z.coerce.number().int().positive().optional(), pageSize: z.coerce.number().int().positive().max(100).optional() });
export const payrollCsvQuerySchema = z.object({ runId: z.coerce.number().int().positive() });
