import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const month = z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM');

export const attendanceQuerySchema = z.object({
  date: date.optional(), fromDate: date.optional(), toDate: date.optional(), status: z.enum(['present', 'late', 'absent', 'on-leave', 'half-day', 'incomplete']).optional(), employeeId: z.coerce.number().int().positive().optional(), page: z.coerce.number().int().positive().optional(), pageSize: z.coerce.number().int().positive().max(100).optional()
}).refine((value) => !(value.fromDate && value.toDate) || value.fromDate <= value.toDate, { message: 'fromDate must be before toDate', path: ['toDate'] });

export const attendanceSummarySchema = z.object({ month: month.optional(), employeeId: z.coerce.number().int().positive().optional() });
