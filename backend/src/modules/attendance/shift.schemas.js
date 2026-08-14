import { z } from 'zod';

const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Use HH:MM or HH:MM:SS');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const nonNegative = z.coerce.number().int().min(0).max(1440);

const shiftFieldsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  startTime: time,
  endTime: time,
  graceMinutes: nonNegative.default(0),
  breakMinutes: nonNegative.default(0),
  overtimeAfterMinutes: nonNegative.default(0),
  isOvernight: z.boolean().default(false),
  isActive: z.boolean().optional()
});

export const shiftCreateSchema = shiftFieldsSchema;
export const shiftUpdateSchema = shiftFieldsSchema.partial().refine((value) => Object.keys(value).length > 0, { message: 'At least one shift field is required' });

const weekday = z.object({ weekday: z.coerce.number().int().min(0).max(6), isWorkingDay: z.boolean().default(true) });
export const shiftScheduleSchema = z.object({ days: z.array(weekday).max(7) }).superRefine((value, context) => {
  const days = value.days.map((item) => item.weekday);
  if (new Set(days).size !== days.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Each weekday may only appear once', path: ['days'] });
});

const shiftAssignmentFieldsSchema = z.object({ shiftId: z.coerce.number().int().positive(), effectiveFrom: date, effectiveTo: date.nullable().optional() });
export const shiftAssignmentCreateSchema = shiftAssignmentFieldsSchema.refine((value) => !value.effectiveTo || value.effectiveFrom <= value.effectiveTo, { message: 'effectiveFrom must be before effectiveTo', path: ['effectiveTo'] });
export const shiftAssignmentUpdateSchema = shiftAssignmentFieldsSchema.partial().refine((value) => Object.keys(value).length > 0, { message: 'At least one assignment field is required' }).refine((value) => !value.effectiveFrom || !value.effectiveTo || value.effectiveFrom <= value.effectiveTo, { message: 'effectiveFrom must be before effectiveTo', path: ['effectiveTo'] });
