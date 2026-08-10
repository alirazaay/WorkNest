import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceCalibrationDecision extends Model {}
PerformanceCalibrationDecision.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, cycleId: { type: DataTypes.INTEGER, allowNull: false, field: 'cycle_id' }, reviewId: { type: DataTypes.INTEGER, allowNull: false, field: 'review_id' }, employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' }, status: { type: DataTypes.STRING(30), allowNull: false }, previousScore: { type: DataTypes.DECIMAL(7, 3), field: 'previous_score' }, newScore: { type: DataTypes.DECIMAL(7, 3), field: 'new_score' }, previousRatingBand: { type: DataTypes.STRING(100), field: 'previous_rating_band' }, newRatingBand: { type: DataTypes.STRING(100), field: 'new_rating_band' }, justification: { type: DataTypes.TEXT }, decidedBy: { type: DataTypes.INTEGER, allowNull: false, field: 'decided_by' }, decidedAt: { type: DataTypes.DATE, allowNull: false, field: 'decided_at' }
}, { sequelize, modelName: 'PerformanceCalibrationDecision', tableName: 'performance_calibration_decisions' });
