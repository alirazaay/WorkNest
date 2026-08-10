import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceFairnessFlag extends Model {}
PerformanceFairnessFlag.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, cycleId: { type: DataTypes.INTEGER, allowNull: false, field: 'cycle_id' }, employeeId: { type: DataTypes.INTEGER, field: 'employee_id' }, reviewId: { type: DataTypes.INTEGER, field: 'review_id' }, flagType: { type: DataTypes.STRING(80), allowNull: false, field: 'flag_type' }, severity: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'warning' }, message: { type: DataTypes.TEXT, allowNull: false }, status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'open' }, sourceType: { type: DataTypes.STRING(50), field: 'source_type' }, sourceId: { type: DataTypes.INTEGER, field: 'source_id' }, metadata: DataTypes.JSON, resolvedBy: { type: DataTypes.INTEGER, field: 'resolved_by' }, resolvedAt: { type: DataTypes.DATE, field: 'resolved_at' }, resolutionNote: { type: DataTypes.TEXT, field: 'resolution_note' }, generatedBy: { type: DataTypes.INTEGER, allowNull: false, field: 'generated_by' }
}, { sequelize, modelName: 'PerformanceFairnessFlag', tableName: 'performance_fairness_flags' });
