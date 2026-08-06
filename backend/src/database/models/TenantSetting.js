import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class TenantSetting extends Model {}
TenantSetting.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'tenant_id' },
  timezone: { type: DataTypes.STRING(64), defaultValue: 'Asia/Karachi' },
  currency: { type: DataTypes.STRING(3), defaultValue: 'PKR' },
  workStartTime: { type: DataTypes.TIME, defaultValue: '09:00:00', field: 'work_start_time' },
  workEndTime: { type: DataTypes.TIME, defaultValue: '17:00:00', field: 'work_end_time' },
  lateThreshold: { type: DataTypes.TIME, defaultValue: '09:15:00', field: 'late_threshold' }
}, { sequelize, modelName: 'TenantSetting', tableName: 'tenant_settings' });
