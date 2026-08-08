import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const money = z.coerce.number().min(0).max(999999999.99);

export const departmentCreateSchema = z.object({ name: z.string().trim().min(2).max(150), headEmployeeId: z.coerce.number().int().positive().nullable().optional() });
export const departmentUpdateSchema = departmentCreateSchema.partial().refine((data) => Object.keys(data).length > 0, 'At least one field is required');

export const employeeCreateSchema = z.object({
  name: z.string().trim().min(2).max(150), email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(128), avatarUrl: z.string().url().max(1000).optional().or(z.literal('')), role: z.enum(['manager', 'employee']).default('employee'),
  departmentId: z.coerce.number().int().positive().nullable().optional(), designation: z.string().trim().max(150).optional(), phone: z.string().trim().max(30).optional(), cnic: z.string().trim().max(30).optional(),
  dateOfBirth: date.nullable().optional(), gender: z.enum(['male', 'female', 'other']).nullable().optional(), address: z.string().max(2000).optional(), joiningDate: date.nullable().optional(), employmentType: z.enum(['full-time', 'part-time', 'contract']).default('full-time'),
  salary: z.object({ effectiveFrom: date.optional(), baseSalary: money.default(0), houseAllowance: money.default(0), transportAllowance: money.default(0), medicalAllowance: money.default(0), taxDeduction: money.default(0), otherDeductions: money.default(0) }).optional()
});

export const employeeUpdateSchema = employeeCreateSchema.omit({ email: true, password: true }).partial();
export const employeeListSchema = z.object({ search: z.string().trim().max(150).optional(), departmentId: z.coerce.number().int().positive().optional(), status: z.enum(['active', 'on-leave', 'terminated']).optional(), page: z.coerce.number().int().positive().default(1), pageSize: z.coerce.number().int().positive().max(100).default(25) });
export const employeeStatusSchema = z.object({ status: z.enum(['active', 'on-leave', 'terminated']), reason: z.string().max(1000).optional() });
export const salarySchema = z.object({ effectiveFrom: date, effectiveTo: date.nullable().optional(), baseSalary: money.default(0), houseAllowance: money.default(0), transportAllowance: money.default(0), medicalAllowance: money.default(0), taxDeduction: money.default(0), otherDeductions: money.default(0) });
export const documentTypeSchema = z.enum(['cnic', 'contract', 'resume', 'other']);
export const documentUploadSchema = z.object({ documentType: documentTypeSchema });
