import PDFDocument from 'pdfkit';
import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Bonus, Employee, EmployeeBankAccount, EmployeeDeduction, EmployeeSalaryComponent, EmployeeSalaryStructure, LeaveRequest, LeaveType, LoanInstallment, Notification, PayrollItem, PayrollItemLine, PayrollRun, SalaryComponent, User } from '../../database/models/index.js';
import { AppError } from '../../middleware/error.js';
import { sendPayrollGeneratedEmail } from '../../services/email.service.js';
import { createNotification } from '../../services/notification.service.js';
import { recordAudit } from '../../services/audit.service.js';
import { cents, moneyFromCents } from './money.js';

function periodFor(month, year) { const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate(); return { start: `${year}-${String(month).padStart(2, '0')}-01`, end: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}` }; }
function roundMoney(value) { return moneyFromCents(Math.round(Number(value) * 100)); }
function overlapDays(from, to, periodStart, periodEnd) { const start = new Date(`${from < periodStart ? periodStart : from}T00:00:00Z`); const end = new Date(`${to > periodEnd ? periodEnd : to}T00:00:00Z`); return Math.max(0, Math.floor((end - start) / 86_400_000) + 1); }
function activeEmployeeInclude() { return { model: Employee, as: 'employee', attributes: ['id', 'employeeCode', 'userId'], include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] }; }

async function employeeForUser(auth) {
  const employee = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId, employmentStatus: { [Op.ne]: 'terminated' } } });
  if (!employee) throw new AppError('You do not have an active employee profile', 403, 'EMPLOYEE_PROFILE_REQUIRED');
  return employee;
}

async function salaryFor(employeeId, tenantId, periodStart, periodEnd, transaction) {
  return EmployeeSalaryStructure.findOne({ where: { employeeId, tenantId, effectiveFrom: { [Op.lte]: periodEnd }, [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: periodStart } }] }, order: [['effectiveFrom', 'DESC']], transaction });
}

async function unpaidDays(employeeId, tenantId, periodStart, periodEnd, transaction) {
  const unpaid = await LeaveType.findOne({ where: { tenantId, code: 'unpaid' }, transaction });
  if (!unpaid) return 0;
  const requests = await LeaveRequest.findAll({ where: { tenantId, employeeId, leaveTypeId: unpaid.id, status: 'approved', fromDate: { [Op.lte]: periodEnd }, toDate: { [Op.gte]: periodStart } }, transaction });
  return requests.reduce((total, request) => total + overlapDays(String(request.fromDate), String(request.toDate), periodStart, periodEnd), 0);
}

async function calculationFor(employee, salary, month, year, period, unpaidLeaveDays, transaction) {
  const lines = []; const base = cents(salary?.baseSalary || 0); lines.push({ lineType: 'earning', componentCode: 'BASE_SALARY', label: 'Base salary', amount: moneyFromCents(base), sourceType: 'salary_structure', sourceId: salary?.id || null });
  const assignments = await EmployeeSalaryComponent.findAll({ where: { tenantId: employee.tenantId, employeeId: employee.id, isActive: true, ...periodWhere(period.start, period.end) }, include: [{ model: SalaryComponent, as: 'component', where: { tenantId: employee.tenantId, isActive: true } }], transaction });
  let earningCents = base; let deductionCents = 0; let allowanceCents = 0; let taxCents = cents(salary?.taxDeduction || 0); let otherCents = cents(salary?.otherDeductions || 0);
  for (const assignment of assignments) { const component = assignment.component; const amount = assignment.percentage != null ? Math.round(base * Number(assignment.percentage) / 100) : cents(assignment.amount); if (amount <= 0) continue; const line = { lineType: component.type, componentCode: component.code, label: component.name, amount: moneyFromCents(amount), sourceType: 'salary_component', sourceId: assignment.id, metadata: { taxable: component.taxable, calculationType: component.calculationType } }; lines.push(line); if (component.type === 'earning') { earningCents += amount; allowanceCents += amount; } else deductionCents += amount; }
  const bonuses = await Bonus.findAll({ where: { tenantId: employee.tenantId, employeeId: employee.id, payrollMonth: month, payrollYear: year, status: 'approved', processedPayrollItemId: null }, transaction, lock: transaction.LOCK.UPDATE });
  for (const bonus of bonuses) { const amount = cents(bonus.amount); earningCents += amount; lines.push({ lineType: 'earning', componentCode: 'BONUS', label: bonus.type, amount: moneyFromCents(amount), sourceType: 'bonus', sourceId: bonus.id, metadata: { reason: bonus.reason } }); }
  const deductions = await EmployeeDeduction.findAll({ where: { tenantId: employee.tenantId, employeeId: employee.id, status: 'active', processedPayrollItemId: null, ...periodWhere(period.start, period.end) }, transaction, lock: transaction.LOCK.UPDATE });
  for (const deduction of deductions) { const amount = deduction.calculationType === 'percentage' ? Math.round(earningCents * Number(deduction.percentage || 0) / 100) : cents(deduction.amount); if (amount <= 0) continue; deductionCents += amount; otherCents += amount; lines.push({ lineType: 'deduction', componentCode: deduction.deductionType.toUpperCase(), label: deduction.reason || deduction.deductionType, amount: moneyFromCents(amount), sourceType: 'deduction', sourceId: deduction.id }); }
  const loanInstallments = await LoanInstallment.findAll({ where: { tenantId: employee.tenantId, installmentMonth: month, installmentYear: year, status: 'pending' }, include: [{ association: 'loan', where: { tenantId: employee.tenantId, employeeId: employee.id, status: 'active' } }], transaction, lock: transaction.LOCK.UPDATE });
  for (const installment of loanInstallments) { const amount = cents(installment.amount); deductionCents += amount; otherCents += amount; lines.push({ lineType: 'deduction', componentCode: 'LOAN_INSTALLMENT', label: 'Loan installment', amount: moneyFromCents(amount), sourceType: 'loan_installment', sourceId: installment.id }); }
  const unpaidCents = Math.round(base / 30 * unpaidLeaveDays); deductionCents += unpaidCents;
  if (taxCents > 0) lines.push({ lineType: 'deduction', componentCode: 'TAX', label: 'Tax deduction', amount: moneyFromCents(taxCents), sourceType: 'salary_structure', sourceId: salary?.id || null });
  if (unpaidCents > 0) lines.push({ lineType: 'deduction', componentCode: 'UNPAID_LEAVE', label: `Unpaid leave (${unpaidLeaveDays} day(s))`, amount: moneyFromCents(unpaidCents), sourceType: 'leave' });
  deductionCents += taxCents + cents(salary?.otherDeductions || 0);
  return { values: { baseSalary: moneyFromCents(base), allowancesTotal: moneyFromCents(allowanceCents), grossSalary: moneyFromCents(earningCents), taxDeduction: moneyFromCents(taxCents), otherDeductions: moneyFromCents(otherCents), unpaidLeaveDeduction: moneyFromCents(unpaidCents), totalDeductions: moneyFromCents(deductionCents), netSalary: moneyFromCents(earningCents - deductionCents), unpaidLeaveDays }, lines, bonuses, deductions, loanInstallments };
}
function periodWhere(start, end) { return { effectiveFrom: { [Op.lte]: end }, [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: start } }] }; }

const runInclude = [{ model: PayrollItem, as: 'items', include: [activeEmployeeInclude(), { model: PayrollItemLine, as: 'lines' }] }, { model: User, as: 'generator', attributes: ['id', 'name'] }, { model: User, as: 'approver', attributes: ['id', 'name'] }];

export async function generatePayroll(auth, { month, year }) {
  const period = periodFor(month, year); let runId; const emails = [];
  try {
    await sequelize.transaction(async (transaction) => {
      const existing = await PayrollRun.findOne({ where: { tenantId: auth.tenantId, month, year }, transaction, lock: transaction.LOCK.UPDATE });
      if (existing) throw new AppError('Payroll already exists for this period', 409, 'PAYROLL_PERIOD_EXISTS');
      const run = await PayrollRun.create({ tenantId: auth.tenantId, month, year, periodStart: period.start, periodEnd: period.end, status: 'processing', generatedBy: auth.userId }, { transaction });
      const employees = await Employee.findAll({ where: { tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' } }, include: [{ model: User, as: 'user', attributes: ['id', 'email'] }], transaction, lock: transaction.LOCK.UPDATE });
      let totalGross = 0; let totalDeductions = 0; let totalNet = 0;
      for (const employee of employees) {
        const salary = await salaryFor(employee.id, auth.tenantId, period.start, period.end, transaction); const unpaidLeaveDays = await unpaidDays(employee.id, auth.tenantId, period.start, period.end, transaction); const calculation = await calculationFor(employee, salary, month, year, period, unpaidLeaveDays, transaction); const values = calculation.values;
        const bank = await EmployeeBankAccount.findOne({ where: { tenantId: auth.tenantId, employeeId: employee.id, isPrimary: true }, transaction });
        const item = await PayrollItem.create({ tenantId: auth.tenantId, payrollRunId: run.id, employeeId: employee.id, ...values, status: 'generated', employeeSnapshot: { employeeId: employee.id, employeeCode: employee.employeeCode, name: employee.user?.name || null, email: employee.user?.email || null }, salarySnapshot: salary?.toJSON() || null, bankSnapshot: bank ? { bankName: bank.bankName, accountTitle: bank.accountTitle, accountNumber: bank.accountNumber, iban: bank.iban, branchCode: bank.branchCode } : null }, { transaction });
        await PayrollItemLine.bulkCreate(calculation.lines.filter((line) => Number(line.amount) > 0).map((line) => ({ tenantId: auth.tenantId, payrollItemId: item.id, ...line })), { transaction });
        for (const bonus of calculation.bonuses) await bonus.update({ processedPayrollItemId: item.id, status: 'processed' }, { transaction });
        for (const deduction of calculation.deductions) if (!deduction.recurring) await deduction.update({ processedPayrollItemId: item.id }, { transaction });
        for (const installment of calculation.loanInstallments) await installment.update({ payrollItemId: item.id, status: 'deducted', deductedAt: new Date() }, { transaction });
        await createNotification({ tenantId: auth.tenantId, userId: employee.userId, type: 'payroll_generated', title: 'Payslip available', message: `Your payslip for ${month}/${year} is available.`, entityType: 'payroll_item', entityId: item.id, transaction });
        if (employee.user?.email) emails.push(employee.user.email);
        totalGross += values.grossSalary; totalDeductions += values.totalDeductions; totalNet += values.netSalary;
      }
      run.totalGross = roundMoney(totalGross); run.totalDeductions = roundMoney(totalDeductions); run.totalNet = roundMoney(totalNet); run.status = 'generated'; await run.save({ fields: ['totalGross', 'totalDeductions', 'totalNet', 'status'], transaction }); runId = run.id;
    });
  } catch (error) { throw error; }
  await Promise.all(emails.map((email) => sendPayrollGeneratedEmail({ email, month, year })));
  return getPayrollRun(auth, runId);
}

export async function listPayrollRuns(auth, query) {
  const where = { tenantId: auth.tenantId }; if (query.month) where.month = query.month; if (query.year) where.year = query.year; if (query.status) where.status = query.status;
  const page = Math.max(1, Number(query.page || 1)); const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 25))); const result = await PayrollRun.findAndCountAll({ where, include: [{ model: PayrollItem, as: 'items', include: [activeEmployeeInclude()] }, { model: User, as: 'generator', attributes: ['id', 'name'] }], order: [['year', 'DESC'], ['month', 'DESC']], limit: pageSize, offset: (page - 1) * pageSize, distinct: true });
  return { items: result.rows, pagination: { page, pageSize, total: result.count, totalPages: Math.ceil(result.count / pageSize) } };
}

export async function getPayrollRun(auth, id) { const run = await PayrollRun.findOne({ where: { id, tenantId: auth.tenantId }, include: runInclude }); if (!run) throw new AppError('Payroll run not found', 404, 'PAYROLL_NOT_FOUND'); return run; }

export async function payrollReview(auth, id) { const run = await getPayrollRun(auth, id); const warnings = []; for (const item of run.items) { if (Number(item.netSalary) <= 0) warnings.push({ level: 'ERROR', employeeId: item.employeeId, message: 'Net salary is zero or negative' }); if (!item.bankSnapshot) warnings.push({ level: 'WARNING', employeeId: item.employeeId, message: 'Primary bank account is missing' }); } const summary = { employees: run.items.length, totalGross: run.totalGross, totalBonuses: run.items.reduce((sum, item) => sum + item.lines.filter((line) => line.sourceType === 'bonus').reduce((n, line) => n + Number(line.amount), 0), 0).toFixed(2), totalTax: run.items.reduce((sum, item) => sum + Number(item.taxDeduction || 0), 0).toFixed(2), totalDeductions: run.totalDeductions, totalNet: run.totalNet, warnings }; await run.update({ reviewSummary: summary, ...(run.status === 'generated' ? { status: 'under_review' } : {}) }); return { run, review: summary }; }
export async function approvePayroll(auth, id) { const run = await PayrollRun.findOne({ where: { id, tenantId: auth.tenantId } }); if (!run) throw new AppError('Payroll run not found', 404, 'PAYROLL_NOT_FOUND'); if (run.status !== 'generated' && run.status !== 'under_review') throw new AppError('Only generated payroll can be approved', 409, 'INVALID_PAYROLL_STATUS'); run.status = 'approved'; run.approvedBy = auth.userId; run.approvedAt = new Date(); await run.save({ fields: ['status', 'approvedBy', 'approvedAt'] }); await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'payroll_approved', entityType: 'payroll_run', entityId: id }); return getPayrollRun(auth, id); }
export async function lockPayroll(auth, id) { const run = await PayrollRun.findOne({ where: { id, tenantId: auth.tenantId } }); if (!run) throw new AppError('Payroll run not found', 404, 'PAYROLL_NOT_FOUND'); if (run.status !== 'approved') throw new AppError('Only approved payroll can be locked', 409, 'INVALID_PAYROLL_STATUS'); run.status = 'locked'; run.lockedAt = new Date(); run.lockedBy = auth.userId; await run.save({ fields: ['status', 'lockedAt', 'lockedBy'] }); await PayrollItem.update({ status: 'locked' }, { where: { payrollRunId: id, tenantId: auth.tenantId } }); await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'payroll_locked', entityType: 'payroll_run', entityId: id }); return getPayrollRun(auth, id); }

export async function getPayrollItem(auth, id) { const employee = auth.role === 'employee' || auth.role === 'manager' ? await employeeForUser(auth) : null; const item = await PayrollItem.findOne({ where: { id, tenantId: auth.tenantId, ...(employee ? { employeeId: employee.id } : {}) }, include: [{ model: PayrollRun, as: 'run' }, activeEmployeeInclude(), { model: PayrollItemLine, as: 'lines' }] }); if (!item) throw new AppError('Payslip not found', 404, 'PAYSLIP_NOT_FOUND'); return item; }
export async function getPayrollItemByPeriod(auth, employeeId, month, year) { const own = auth.role === 'employee' || auth.role === 'manager' ? await employeeForUser(auth) : null; const targetId = own ? own.id : employeeId; const item = await PayrollItem.findOne({ where: { tenantId: auth.tenantId, employeeId: targetId }, include: [{ model: PayrollRun, as: 'run', where: { month, year } }, activeEmployeeInclude(), { model: PayrollItemLine, as: 'lines' }] }); if (!item) throw new AppError('Payslip not found', 404, 'PAYSLIP_NOT_FOUND'); return item; }
export async function getMyPayroll(auth, query) { const employee = await employeeForUser(auth); const where = { tenantId: auth.tenantId, employeeId: employee.id }; if (query.month) where['$run.month$'] = query.month; if (query.year) where['$run.year$'] = query.year; return PayrollItem.findAll({ where, include: [{ model: PayrollRun, as: 'run', where: { ...(query.month ? { month: query.month } : {}), ...(query.year ? { year: query.year } : {}) } }, { model: PayrollItemLine, as: 'lines' }], order: [[{ model: PayrollRun, as: 'run' }, 'year', 'DESC'], [{ model: PayrollRun, as: 'run' }, 'month', 'DESC']] }); }

function csv(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
export async function payrollCsv(auth, id) { const run = await getPayrollRun(auth, id); const rows = ['Employee code,Employee name,Gross salary,Total deductions,Net salary,Status']; for (const item of run.items) rows.push([item.employee.employeeCode, item.employee.user.name, item.grossSalary, item.totalDeductions, item.netSalary, item.status].map(csv).join(',')); return rows.join('\n'); }
export async function bankCsv(auth, id) { const run = await getPayrollRun(auth, id); if (!['approved', 'locked'].includes(run.status)) throw new AppError('Bank export requires approved or locked payroll', 409, 'INVALID_PAYROLL_STATUS'); const rows = ['Employee Code,Employee Name,Bank Name,Account Title,Account Number,IBAN,Net Salary,Payroll Month,Payroll Year,Payment Reference']; for (const item of run.items) { const snapshot = item.bankSnapshot || {}; rows.push([item.employee.employeeCode, item.employee.user.name, snapshot.bankName || '', snapshot.accountTitle || '', snapshot.accountNumber || '', snapshot.iban || '', item.netSalary, run.month, run.year, `WORKNEST-${run.year}${String(run.month).padStart(2, '0')}-${item.id}`].map(csv).join(',')); } await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'payroll_bank_exported', entityType: 'payroll_run', entityId: id }); return rows.join('\n'); }

export async function buildPayslipPdf(auth, id) { const item = await getPayrollItem(auth, id); const run = item.run; return new Promise((resolve, reject) => { const doc = new PDFDocument({ margin: 50 }); const chunks = []; doc.on('data', (chunk) => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); doc.fontSize(24).fillColor('#4338ca').text('WorkNest', { continued: false }); doc.moveDown(.4).fontSize(18).fillColor('#111827').text('Employee Payslip'); doc.fontSize(10).fillColor('#6b7280').text(`Period: ${run.month}/${run.year}`); doc.moveDown(); doc.fontSize(12).fillColor('#111827').text(`Employee: ${item.employee.user.name}`); doc.text(`Employee code: ${item.employee.employeeCode}`); doc.moveDown(); doc.fontSize(12).text('Payroll summary'); doc.moveDown(.5); for (const line of item.lines) doc.fontSize(11).text(`${line.lineType === 'deduction' ? '−' : '+'} ${line.label}`, { continued: true }).text(`PKR ${Number(line.amount).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`, { align: 'right' }); doc.moveDown(); doc.fontSize(13).text(`Gross salary: PKR ${Number(item.grossSalary).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`); doc.text(`Total deductions: PKR ${Number(item.totalDeductions).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`); doc.fontSize(16).fillColor('#4338ca').text(`Net salary: PKR ${Number(item.netSalary).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`); doc.end(); }); }
