import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
export const leaveRequestSchema = z.object({ leaveTypeId: z.coerce.number().int().positive(), fromDate: date, toDate: date, reason: z.string().trim().max(2000).optional() }).refine((value) => value.fromDate <= value.toDate, { path: ['toDate'], message: 'toDate must be on or after fromDate' });
export const leaveListSchema = z.object({ status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(), fromDate: date.optional(), toDate: date.optional(), employeeId: z.coerce.number().int().positive().optional(), page: z.coerce.number().int().positive().optional(), pageSize: z.coerce.number().int().positive().max(100).optional() }).refine((value) => !(value.fromDate && value.toDate) || value.fromDate <= value.toDate, { path: ['toDate'], message: 'fromDate must be before toDate' });
export const leaveReviewSchema = z.object({ comment: z.string().trim().max(2000).optional() });
export const leaveCalendarSchema = z.object({ fromDate: date, toDate: date }).refine((value) => value.fromDate <= value.toDate, { path: ['toDate'], message: 'fromDate must be before toDate' });
export const leaveTypeSchema = z.object({ name: z.string().trim().min(2).max(80), code: z.string().trim().regex(/^[a-z0-9_-]+$/).max(30), isPaid: z.boolean().default(true), annualAllowance: z.coerce.number().int().min(0).max(366), requiresApproval: z.boolean().default(true), isActive: z.boolean().default(true) });
