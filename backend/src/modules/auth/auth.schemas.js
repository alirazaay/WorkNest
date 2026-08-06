import { z } from 'zod';

const password = z.string().min(8).max(128);
const email = z.string().trim().toLowerCase().email();

export const registerSchema = z.object({
  companyName: z.string().trim().min(2).max(150), industry: z.string().trim().max(100).optional(),
  companySize: z.string().trim().max(20).optional(), adminName: z.string().trim().min(2).max(150), adminEmail: email, password, confirmPassword: password
}).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const loginSchema = z.object({ email, password });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(32), password, confirmPassword: password }).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
export const inviteSchema = z.object({ email, name: z.string().trim().min(2).max(150), role: z.enum(['manager', 'employee']).default('employee'), departmentId: z.coerce.number().int().positive().nullable().optional() });
export const acceptInvitationSchema = z.object({ token: z.string().min(32), name: z.string().trim().min(2).max(150).optional(), password, confirmPassword: password }).refine((data) => data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
