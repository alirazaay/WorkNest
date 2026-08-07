import { z } from 'zod';

export const companySettingsSchema = z.object({ companyName: z.string().trim().min(2).max(150), industry: z.string().trim().max(100).optional(), address: z.string().trim().max(2000).optional(), logoUrl: z.string().url().max(1000).optional().or(z.literal('')) });
export const workHoursSchema = z.object({ timezone: z.string().trim().min(1).max(64), currency: z.string().trim().length(3).transform(value => value.toUpperCase()), workStartTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Use HH:MM or HH:MM:SS'), workEndTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Use HH:MM or HH:MM:SS'), lateThreshold: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Use HH:MM or HH:MM:SS') });
