import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { AppError } from '../../middleware/error.js';
import { recordAudit } from '../../services/audit.service.js';
import { Employee, EmployeeBankAccount, EmployeeDeduction, EmployeeLoan, EmployeeSalaryComponent, EmployeeSalaryStructure, Bonus, LoanInstallment, SalaryComponent, EmployeeTaxConfiguration, PayrollAdjustment, PayrollRun, PayrollItem, PayrollItemLine } from '../../database/models/index.js';
import { cents, moneyFromCents } from './money.js';

const periodWhere = (start, end) => ({ effectiveFrom: { [Op.lte]: end }, [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: start } }] });
const employeeWhere = (auth, employeeId) => ({ id: employeeId, tenantId: auth.tenantId });
const findEmployee = async (auth, employeeId) => { const employee = await Employee.findOne({ where: employeeWhere(auth, employeeId) }); if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND'); return employee; };
const money = (value) => { const text = String(value ?? '0'); if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new AppError('Money values must be non-negative decimal amounts', 422, 'INVALID_MONEY'); return Number(text).toFixed(2); };

export async function listSalaryStructures(auth, employeeId = null) { const where = { tenantId: auth.tenantId, ...(employeeId ? { employeeId } : {}) }; return EmployeeSalaryStructure.findAll({ where, order: [['employeeId', 'ASC'], ['effectiveFrom', 'DESC']] }); }
export async function changeSalaryStructure(auth, employeeId, input) {
  await findEmployee(auth, employeeId);
  return sequelize.transaction(async (transaction) => {
    const current = await EmployeeSalaryStructure.findOne({ where: { tenantId: auth.tenantId, employeeId, effectiveFrom: { [Op.lt]: input.effectiveFrom }, [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: input.effectiveFrom } }] }, order: [['effectiveFrom', 'DESC']], transaction, lock: transaction.LOCK.UPDATE });
    if (current) { const end = new Date(`${input.effectiveFrom}T00:00:00Z`); end.setUTCDate(end.getUTCDate() - 1); current.effectiveTo = end.toISOString().slice(0, 10); await current.save({ transaction }); }
    const created = await EmployeeSalaryStructure.create({ tenantId: auth.tenantId, employeeId, createdBy: auth.userId, ...input, baseSalary: money(input.baseSalary), houseAllowance: money(input.houseAllowance), transportAllowance: money(input.transportAllowance), medicalAllowance: money(input.medicalAllowance), taxDeduction: money(input.taxDeduction), otherDeductions: money(input.otherDeductions) }, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'salary_structure_changed', entityType: 'employee_salary_structure', entityId: created.id, afterData: created.toJSON(), transaction });
    return created;
  });
}
export async function listComponents(auth) { return SalaryComponent.findAll({ where: { tenantId: auth.tenantId }, include: [{ model: EmployeeSalaryComponent, as: 'assignments', attributes: ['id', 'employeeId', 'amount', 'percentage', 'effectiveFrom', 'effectiveTo', 'isActive'] }], order: [['name', 'ASC']] }); }
export async function createComponent(auth, input) { const component = await SalaryComponent.create({ tenantId: auth.tenantId, ...input, code: input.code.toUpperCase() }); await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'salary_component_created', entityType: 'salary_component', entityId: component.id, afterData: component.toJSON() }); return component; }
export async function updateComponent(auth, id, input) { const component = await SalaryComponent.findOne({ where: { id, tenantId: auth.tenantId } }); if (!component) throw new AppError('Salary component not found', 404, 'COMPONENT_NOT_FOUND'); const before = component.toJSON(); await component.update(input); await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'salary_component_updated', entityType: 'salary_component', entityId: id, beforeData: before, afterData: component.toJSON() }); return component; }
export async function assignComponent(auth, employeeId, componentId, input) { await findEmployee(auth, employeeId); const component = await SalaryComponent.findOne({ where: { id: componentId, tenantId: auth.tenantId, isActive: true } }); if (!component) throw new AppError('Salary component not found', 404, 'COMPONENT_NOT_FOUND'); const assignment = await EmployeeSalaryComponent.create({ tenantId: auth.tenantId, employeeId, componentId, ...input }); await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'salary_component_assigned', entityType: 'employee_salary_component', entityId: assignment.id, afterData: assignment.toJSON() }); return assignment; }

export async function listBonuses(auth, query = {}) { return Bonus.findAll({ where: { tenantId: auth.tenantId, ...(query.employeeId ? { employeeId: query.employeeId } : {}), ...(query.status ? { status: query.status } : {}) }, include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeCode'] }], order: [['payroll_year', 'DESC'], ['payroll_month', 'DESC'], ['created_at', 'DESC']] }); }
export async function createBonus(auth, input) { await findEmployee(auth, input.employeeId); const bonus = await Bonus.create({ tenantId: auth.tenantId, createdBy: auth.userId, ...input, amount: money(input.amount) }); await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'bonus_created', entityType: 'bonus', entityId: bonus.id, afterData: bonus.toJSON() }); return bonus; }
export async function setBonusStatus(auth, id, status) {
  return sequelize.transaction(async (transaction) => {
    const bonus = await Bonus.findOne({ where: { id, tenantId: auth.tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!bonus) throw new AppError('Bonus not found', 404, 'BONUS_NOT_FOUND');
    if (!['draft', 'pending', 'approved', 'rejected'].includes(bonus.status)) throw new AppError('Processed bonuses cannot be changed', 409, 'BONUS_IMMUTABLE');
    await bonus.update({ status, ...(status === 'approved' ? { approvedBy: auth.userId, approvedAt: new Date() } : {}) }, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: `bonus_${status}`, entityType: 'bonus', entityId: id, afterData: bonus.toJSON(), transaction });
    return bonus;
  });
}

export async function listDeductions(auth, query = {}) { return EmployeeDeduction.findAll({ where: { tenantId: auth.tenantId, ...(query.employeeId ? { employeeId: query.employeeId } : {}), ...(query.status ? { status: query.status } : {}) }, order: [['effectiveFrom', 'DESC']] }); }
export async function createDeduction(auth, input) { await findEmployee(auth, input.employeeId); const deduction = await EmployeeDeduction.create({ tenantId: auth.tenantId, createdBy: auth.userId, ...input, amount: money(input.amount) }); await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'deduction_created', entityType: 'employee_deduction', entityId: deduction.id, afterData: deduction.toJSON() }); return deduction; }
export async function updateDeduction(auth, id, input) { const row = await EmployeeDeduction.findOne({ where: { id, tenantId: auth.tenantId } }); if (!row) throw new AppError('Deduction not found', 404, 'DEDUCTION_NOT_FOUND'); if (row.processedPayrollItemId) throw new AppError('Processed deductions are immutable', 409, 'DEDUCTION_IMMUTABLE'); const before = row.toJSON(); await row.update({ ...input, ...(input.amount !== undefined ? { amount: money(input.amount) } : {}) }); await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'deduction_updated', entityType: 'employee_deduction', entityId: id, beforeData: before, afterData: row.toJSON() }); return row; }

export async function listLoans(auth) { return EmployeeLoan.findAll({ where: { tenantId: auth.tenantId }, include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeCode'] }, { model: LoanInstallment, as: 'installments' }], order: [['created_at', 'DESC']] }); }
export async function getLoan(auth, id) { const loan = await EmployeeLoan.findOne({ where: { id, tenantId: auth.tenantId }, include: [{ model: LoanInstallment, as: 'installments' }] }); if (!loan) throw new AppError('Loan not found', 404, 'LOAN_NOT_FOUND'); return loan; }
export async function createLoan(auth, input) { await findEmployee(auth, input.employeeId); const loan = await EmployeeLoan.create({ tenantId: auth.tenantId, ...input, requestedAmount: money(input.requestedAmount), status: 'pending' }); await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'loan_created', entityType: 'employee_loan', entityId: loan.id, afterData: loan.toJSON() }); return loan; }
export async function setLoanStatus(auth, id, status, input = {}) { const loan = await getLoan(auth, id); if (loan.status !== 'pending') throw new AppError('Only pending loans can be reviewed', 409, 'LOAN_IMMUTABLE'); const approvedAmount = input.approvedAmount ?? loan.requestedAmount; const installmentAmount = input.installmentAmount ?? approvedAmount; await sequelize.transaction(async (transaction) => { const nextStatus = status === 'approved' ? 'active' : status; await loan.update({ status: nextStatus, approvedBy: status === 'approved' ? auth.userId : null, approvedAt: status === 'approved' ? new Date() : null, approvedAmount: status === 'approved' ? money(approvedAmount) : null, installmentAmount: status === 'approved' ? money(installmentAmount) : null, outstandingBalance: status === 'approved' ? money(approvedAmount) : null, numberOfInstallments: status === 'approved' ? input.numberOfInstallments : null, startMonth: status === 'approved' ? input.startMonth : null, startYear: status === 'approved' ? input.startYear : null }, { transaction }); if (status === 'approved' && input.numberOfInstallments && input.startMonth && input.startYear) { const start = new Date(Date.UTC(input.startYear, input.startMonth - 1, 1)); const rows = Array.from({ length: input.numberOfInstallments }, (_, index) => { const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1)); return { tenantId: auth.tenantId, loanId: loan.id, installmentMonth: date.getUTCMonth() + 1, installmentYear: date.getUTCFullYear(), amount: money(installmentAmount), status: 'pending' }; }); await LoanInstallment.bulkCreate(rows, { transaction }); } }); return getLoan(auth, id); }
export async function loanInstallments(auth, id) { await getLoan(auth, id); return LoanInstallment.findAll({ where: { tenantId: auth.tenantId, loanId: id }, order: [['installmentYear', 'ASC'], ['installmentMonth', 'ASC']] }); }

export async function listBankAccounts(auth, employeeId) { await findEmployee(auth, employeeId); return EmployeeBankAccount.findAll({ where: { tenantId: auth.tenantId, employeeId }, attributes: { exclude: ['accountNumber', 'iban'] }, order: [['isPrimary', 'DESC'], ['createdAt', 'DESC']] }); }
export async function createBankAccount(auth, employeeId, input) { await findEmployee(auth, employeeId); return sequelize.transaction(async (transaction) => { if (input.isPrimary) await EmployeeBankAccount.update({ isPrimary: false }, { where: { tenantId: auth.tenantId, employeeId }, transaction }); const account = await EmployeeBankAccount.create({ tenantId: auth.tenantId, employeeId, ...input }, { transaction }); await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'bank_account_created', entityType: 'employee_bank_account', entityId: account.id, afterData: { ...account.toJSON(), accountNumber: undefined, iban: undefined }, transaction }); return account; }); }
export async function updateBankAccount(auth, id, input) { const account = await EmployeeBankAccount.findOne({ where: { id, tenantId: auth.tenantId } }); if (!account) throw new AppError('Bank account not found', 404, 'BANK_ACCOUNT_NOT_FOUND'); return sequelize.transaction(async (transaction) => { if (input.isPrimary) await EmployeeBankAccount.update({ isPrimary: false }, { where: { tenantId: auth.tenantId, employeeId: account.employeeId }, transaction }); const before = account.toJSON(); await account.update(input, { transaction }); await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'bank_account_updated', entityType: 'employee_bank_account', entityId: id, beforeData: { ...before, accountNumber: undefined, iban: undefined }, afterData: { ...account.toJSON(), accountNumber: undefined, iban: undefined }, transaction }); return account; }); }

export async function listTaxConfigurations(auth, employeeId) { await findEmployee(auth, employeeId); return EmployeeTaxConfiguration.findAll({ where: { tenantId: auth.tenantId, employeeId }, order: [['effectiveFrom', 'DESC']] }); }
export async function createTaxConfiguration(auth, employeeId, input) { await findEmployee(auth, employeeId); const tax = await EmployeeTaxConfiguration.create({ tenantId: auth.tenantId, employeeId, createdBy: auth.userId, ...input, amount: money(input.amount || 0) }); await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'tax_configuration_created', entityType: 'employee_tax_configuration', entityId: tax.id, afterData: tax.toJSON() }); return tax; }
export async function createAdjustment(auth, input) {
  return sequelize.transaction(async (transaction) => {
    const run = await PayrollRun.findOne({ where: { id: input.payrollRunId, tenantId: auth.tenantId, status: 'locked' }, transaction, lock: transaction.LOCK.UPDATE });
    if (!run) throw new AppError('Adjustments are only available for locked payroll runs', 409, 'ADJUSTMENT_RUN_REQUIRED');
    await findEmployee(auth, input.employeeId);
    const adjustment = await PayrollAdjustment.create({ tenantId: auth.tenantId, ...input, createdBy: auth.userId, amount: money(input.amount) }, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'payroll_adjustment_created', entityType: 'payroll_adjustment', entityId: adjustment.id, afterData: adjustment.toJSON(), transaction });
    return adjustment;
  });
}
export async function approveAdjustment(auth, id) {
  return sequelize.transaction(async (transaction) => {
    const adjustment = await PayrollAdjustment.findOne({ where: { id, tenantId: auth.tenantId, status: 'pending' }, transaction, lock: transaction.LOCK.UPDATE });
    if (!adjustment) throw new AppError('Pending adjustment not found', 404, 'ADJUSTMENT_NOT_FOUND');
    const run = await PayrollRun.findOne({ where: { id: adjustment.payrollRunId, tenantId: auth.tenantId, status: 'locked' }, transaction, lock: transaction.LOCK.UPDATE });
    if (!run) throw new AppError('Adjustments are only available for locked payroll runs', 409, 'ADJUSTMENT_RUN_REQUIRED');
    const payrollItem = await PayrollItem.findOne({ where: { payrollRunId: run.id, employeeId: adjustment.employeeId, tenantId: auth.tenantId, status: 'locked' }, transaction, lock: transaction.LOCK.UPDATE });
    if (!payrollItem) throw new AppError('Payroll item not found', 404, 'PAYROLL_ITEM_NOT_FOUND');
    const amountCents = cents(adjustment.amount);
    await PayrollItemLine.create({ tenantId: auth.tenantId, payrollItemId: payrollItem.id, lineType: adjustment.lineType, componentCode: 'ADJUSTMENT', sourceType: 'payroll_adjustment', sourceId: adjustment.id, label: adjustment.reason, amount: moneyFromCents(amountCents) }, { transaction });
    const grossCents = cents(payrollItem.grossSalary || 0);
    const deductionCents = cents(payrollItem.totalDeductions || 0);
    const netCents = cents(payrollItem.netSalary || 0);
    if (adjustment.lineType === 'earning') {
      payrollItem.grossSalary = moneyFromCents(grossCents + amountCents);
      payrollItem.netSalary = moneyFromCents(netCents + amountCents);
      run.totalGross = moneyFromCents(cents(run.totalGross || 0) + amountCents);
      run.totalNet = moneyFromCents(cents(run.totalNet || 0) + amountCents);
    } else {
      payrollItem.totalDeductions = moneyFromCents(deductionCents + amountCents);
      payrollItem.netSalary = moneyFromCents(netCents - amountCents);
      run.totalDeductions = moneyFromCents(cents(run.totalDeductions || 0) + amountCents);
      run.totalNet = moneyFromCents(cents(run.totalNet || 0) - amountCents);
    }
    await payrollItem.save({ transaction });
    await run.save({ fields: ['totalGross', 'totalDeductions', 'totalNet'], transaction });
    await adjustment.update({ status: 'approved', approvedBy: auth.userId, approvedAt: new Date() }, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'payroll_adjustment_approved', entityType: 'payroll_adjustment', entityId: adjustment.id, afterData: adjustment.toJSON(), transaction });
    return adjustment;
  });
}
