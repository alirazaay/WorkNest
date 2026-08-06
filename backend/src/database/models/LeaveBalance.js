import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class LeaveBalance extends Model {}
LeaveBalance.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' }, leaveTypeId: { type: DataTypes.INTEGER, allowNull: false, field: 'leave_type_id' }, year: { type: DataTypes.INTEGER, allowNull: false }, allocatedDays: { type: DataTypes.INTEGER, defaultValue: 0, field: 'allocated_days' }, usedDays: { type: DataTypes.INTEGER, defaultValue: 0, field: 'used_days' }, pendingDays: { type: DataTypes.INTEGER, defaultValue: 0, field: 'pending_days' }
}, { sequelize, modelName: 'LeaveBalance', tableName: 'leave_balances' });
