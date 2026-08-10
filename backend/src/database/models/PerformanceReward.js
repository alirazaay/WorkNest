import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceReward extends Model {}
PerformanceReward.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, cycleId: { type: DataTypes.INTEGER, allowNull: false, field: 'cycle_id' }, employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' }, rewardType: { type: DataTypes.STRING(40), allowNull: false, field: 'reward_type' }, recommendedValue: { type: DataTypes.DECIMAL(14, 2), allowNull: false, field: 'recommended_value' }, approvedValue: { type: DataTypes.DECIMAL(14, 2), field: 'approved_value' }, reason: { type: DataTypes.TEXT, allowNull: false }, status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'recommended' }, recommendedBy: { type: DataTypes.INTEGER, allowNull: false, field: 'recommended_by' }, approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' }, approvedAt: { type: DataTypes.DATE, field: 'approved_at' }, approvalReason: { type: DataTypes.TEXT, field: 'approval_reason' }
}, { sequelize, modelName: 'PerformanceReward', tableName: 'performance_rewards' });
