import { z } from 'zod';

const period = z.object({ month: z.coerce.number().int().min(1).max(12), year: z.coerce.number().int().min(2000).max(2200) });
export const payrollPeriodSchema = period;
export const payrollRunQuerySchema = z.object({ month: z.coerce.number().int().min(1).max(12).optional(), year: z.coerce.number().int().min(2000).max(2200).optional(), status: z.enum(['draft', 'processing', 'generated', 'under_review', 'approved', 'locked', 'failed']).optional(), page: z.coerce.number().int().positive().optional(), pageSize: z.coerce.number().int().positive().max(100).optional() });
export const payrollCsvQuerySchema = z.object({ runId: z.coerce.number().int().positive() });
const id = z.coerce.number().int().positive();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.number().nonnegative()]);
export const salaryStructureSchema = z.object({ effectiveFrom: date, effectiveTo: date.nullable().optional(), baseSalary: money.default(0), houseAllowance: money.default(0), transportAllowance: money.default(0), medicalAllowance: money.default(0), taxDeduction: money.default(0), otherDeductions: money.default(0), currency: z.string().length(3).default('PKR'), payFrequency: z.enum(['monthly', 'weekly', 'biweekly', 'annual']).default('monthly') });
export const componentSchema = z.object({ code: z.string().min(2).max(60), name: z.string().min(2).max(150), type: z.enum(['earning', 'deduction']), category: z.string().max(50).default('other'), calculationType: z.enum(['fixed', 'percentage']), percentageBase: z.string().max(50).optional().nullable(), taxable: z.boolean().default(false), recurring: z.boolean().default(true) });
export const componentAssignmentSchema = z.object({ amount: money.default(0), percentage: z.number().nonnegative().max(100).optional(), effectiveFrom: date, effectiveTo: date.nullable().optional(), isActive: z.boolean().default(true) });
export const bonusSchema = z.object({ employeeId: id, type: z.string().min(2).max(50), amount: money, payrollMonth: z.coerce.number().int().min(1).max(12), payrollYear: z.coerce.number().int().min(2000).max(2200), reason: z.string().max(1000).optional(), status: z.enum(['draft', 'pending']).default('draft') });
export const deductionSchema = z.object({ employeeId: id, deductionType: z.string().min(2).max(50), amount: money.default(0), calculationType: z.enum(['fixed', 'percentage']).default('fixed'), percentage: z.number().nonnegative().max(100).optional(), reason: z.string().max(1000).optional(), recurring: z.boolean().default(false), effectiveFrom: date, effectiveTo: date.nullable().optional() });
export const loanSchema = z.object({ employeeId: id, loanType: z.string().min(2).max(50), requestedAmount: money });
export const loanApprovalSchema = z.object({ approvedAmount: money.optional(), installmentAmount: money.optional(), numberOfInstallments: z.coerce.number().int().positive().optional(), startMonth: z.coerce.number().int().min(1).max(12).optional(), startYear: z.coerce.number().int().min(2000).max(2200).optional() });
export const bankAccountSchema = z.object({ bankName: z.string().min(2).max(150), accountTitle: z.string().min(2).max(150), accountNumber: z.string().max(100).optional(), iban: z.string().max(100).optional(), branchCode: z.string().max(50).optional(), isPrimary: z.boolean().default(false) });
export const payrollEmployeeQuerySchema = z.object({ employeeId: id.optional(), status: z.string().optional() });
