import { z } from 'zod';

const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);
const radius = z.coerce.number().int().min(25).max(5000);

export const locationCreateSchema = z.object({ name: z.string().trim().min(2).max(100), latitude, longitude, radiusMeters: radius.default(150), isActive: z.boolean().optional() });
export const locationUpdateSchema = locationCreateSchema.partial().refine((value) => Object.keys(value).length > 0, { message: 'At least one location field is required' });
export const gpsClockInSchema = z.object({ locationId: z.coerce.number().int().positive(), latitude, longitude, accuracy: z.coerce.number().positive().max(200), deviceMetadata: z.record(z.string(), z.string().max(200)).optional() });
