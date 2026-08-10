import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceCalibrationSetting extends Model {}
PerformanceCalibrationSetting.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'tenant_id' }, blindReviewEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'blind_review_enabled' }, updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
}, { sequelize, modelName: 'PerformanceCalibrationSetting', tableName: 'performance_calibration_settings' });
