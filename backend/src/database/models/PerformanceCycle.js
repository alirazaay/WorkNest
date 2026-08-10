import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceCycle extends Model {}

PerformanceCycle.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  name: { type: DataTypes.STRING(180), allowNull: false },
  cycleType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'annual', field: 'cycle_type' },
  year: { type: DataTypes.SMALLINT, allowNull: false },
  startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
  endDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'end_date' },
  goalSettingStart: { type: DataTypes.DATEONLY, field: 'goal_setting_start' },
  goalSettingEnd: { type: DataTypes.DATEONLY, field: 'goal_setting_end' },
  reviewStart: { type: DataTypes.DATEONLY, field: 'review_start' },
  reviewEnd: { type: DataTypes.DATEONLY, field: 'review_end' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
  createdBy: { type: DataTypes.INTEGER, allowNull: false, field: 'created_by' }
}, { sequelize, modelName: 'PerformanceCycle', tableName: 'performance_cycles' });
