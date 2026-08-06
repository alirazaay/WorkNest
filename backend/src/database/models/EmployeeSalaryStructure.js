import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class EmployeeSalaryStructure extends Model {}
EmployeeSalaryStructure.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_from' }, effectiveTo: { type: DataTypes.DATEONLY, field: 'effective_to' },
  baseSalary: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'base_salary' }, houseAllowance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'house_allowance' }, transportAllowance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'transport_allowance' },
  medicalAllowance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'medical_allowance' }, taxDeduction: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'tax_deduction' }, otherDeductions: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0, field: 'other_deductions' }
}, { sequelize, modelName: 'EmployeeSalaryStructure', tableName: 'employee_salary_structures' });
