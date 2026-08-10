import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceRatingBand extends Model {}
PerformanceRatingBand.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  name: { type: DataTypes.STRING(100), allowNull: false },
  minScore: { type: DataTypes.DECIMAL(7, 3), allowNull: false, field: 'min_score' },
  maxScore: { type: DataTypes.DECIMAL(7, 3), allowNull: false, field: 'max_score' },
  description: DataTypes.TEXT,
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' }
}, { sequelize, modelName: 'PerformanceRatingBand', tableName: 'performance_rating_bands' });
