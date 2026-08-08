import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class EmployeeSalaryComponent extends Model {}
EmployeeSalaryComponent.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' }, componentId: { type: DataTypes.INTEGER, allowNull: false, field: 'component_id' },
  amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 }, percentage: { type: DataTypes.DECIMAL(7, 4) }, effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_from' }, effectiveTo: { type: DataTypes.DATEONLY, field: 'effective_to' }, isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' }
}, { sequelize, modelName: 'EmployeeSalaryComponent', tableName: 'employee_salary_components' });
