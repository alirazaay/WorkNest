import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class EmployeeShiftAssignment extends Model {}
EmployeeShiftAssignment.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  shiftId: { type: DataTypes.INTEGER, allowNull: false, field: 'shift_id' },
  effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_from' },
  effectiveTo: { type: DataTypes.DATEONLY, field: 'effective_to' },
  assignedBy: { type: DataTypes.INTEGER, allowNull: false, field: 'assigned_by' }
}, { sequelize, modelName: 'EmployeeShiftAssignment', tableName: 'employee_shift_assignments' });
