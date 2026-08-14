import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
export const calendarQuerySchema = z.object({ fromDate: date, toDate: date, employeeId: z.coerce.number().int().positive().optional() }).refine((value) => value.fromDate <= value.toDate, { message: 'fromDate must be before toDate', path: ['toDate'] });
export const holidayCreateSchema = z.object({ holidayDate: date, name: z.string().trim().min(2).max(120), isOptional: z.boolean().default(false) });
export const holidayUpdateSchema = holidayCreateSchema.partial().refine((value) => Object.keys(value).length > 0, { message: 'At least one holiday field is required' });
