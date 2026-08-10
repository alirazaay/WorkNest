import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceCriterion extends Model {}
PerformanceCriterion.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  name: { type: DataTypes.STRING(150), allowNull: false },
  description: DataTypes.TEXT,
  category: { type: DataTypes.STRING(80), allowNull: false },
  weight: { type: DataTypes.DECIMAL(6, 3), allowNull: false, defaultValue: 0 },
  ratingScaleMin: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0, field: 'rating_scale_min' },
  ratingScaleMax: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 5, field: 'rating_scale_max' },
  evidenceRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'evidence_required' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' }
}, { sequelize, modelName: 'PerformanceCriterion', tableName: 'performance_criteria' });
