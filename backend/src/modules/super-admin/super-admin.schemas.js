import { z } from 'zod';

export const tenantListSchema = z.object({ search: z.string().trim().max(150).optional(), plan: z.enum(['starter', 'growth', 'enterprise']).optional(), status: z.enum(['active', 'inactive']).optional(), page: z.coerce.number().int().positive().optional(), pageSize: z.coerce.number().int().positive().max(100).optional() });
export const tenantIdSchema = z.object({ id: z.coerce.number().int().positive() });
