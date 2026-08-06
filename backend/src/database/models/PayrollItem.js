import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PayrollItem extends Model {}
PayrollItem.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, payrollRunId: { type: DataTypes.INTEGER, allowNull: false, field: 'payroll_run_id' }, employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' }, baseSalary: { type: DataTypes.DECIMAL(12, 2), field: 'base_salary' }, allowancesTotal: { type: DataTypes.DECIMAL(12, 2), field: 'allowances_total' }, grossSalary: { type: DataTypes.DECIMAL(12, 2), field: 'gross_salary' }, taxDeduction: { type: DataTypes.DECIMAL(12, 2), field: 'tax_deduction' }, otherDeductions: { type: DataTypes.DECIMAL(12, 2), field: 'other_deductions' }, unpaidLeaveDeduction: { type: DataTypes.DECIMAL(12, 2), field: 'unpaid_leave_deduction' }, totalDeductions: { type: DataTypes.DECIMAL(12, 2), field: 'total_deductions' }, netSalary: { type: DataTypes.DECIMAL(12, 2), field: 'net_salary' }, status: { type: DataTypes.STRING(20), defaultValue: 'generated' }
}, { sequelize, modelName: 'PayrollItem', tableName: 'payroll_items' });
