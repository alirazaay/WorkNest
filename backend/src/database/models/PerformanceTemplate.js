import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceTemplate extends Model {}
PerformanceTemplate.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  name: { type: DataTypes.STRING(180), allowNull: false },
  jobRole: { type: DataTypes.STRING(150), field: 'job_role' },
  description: DataTypes.TEXT,
  ratingScaleMin: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0, field: 'rating_scale_min' },
  ratingScaleMax: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 5, field: 'rating_scale_max' },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
  createdBy: { type: DataTypes.INTEGER, allowNull: false, field: 'created_by' }
}, { sequelize, modelName: 'PerformanceTemplate', tableName: 'performance_templates' });
