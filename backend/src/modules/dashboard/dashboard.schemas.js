import { z } from 'zod';

export const trendQuerySchema = z.object({ months: z.coerce.number().int().min(1).max(24).optional() });
export const activityQuerySchema = z.object({ limit: z.coerce.number().int().positive().max(100).optional() });
