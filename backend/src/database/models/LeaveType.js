import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class LeaveType extends Model {}
LeaveType.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, name: { type: DataTypes.STRING(80), allowNull: false }, code: { type: DataTypes.STRING(30), allowNull: false }, isPaid: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_paid' }, annualAllowance: { type: DataTypes.INTEGER, defaultValue: 0, field: 'annual_allowance' }, requiresApproval: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'requires_approval' }, isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' }
}, { sequelize, modelName: 'LeaveType', tableName: 'leave_types' });
