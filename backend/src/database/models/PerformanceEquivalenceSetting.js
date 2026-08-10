import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceEquivalenceSetting extends Model {}
PerformanceEquivalenceSetting.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'tenant_id' },
  threshold: { type: DataTypes.DECIMAL(7, 3), allowNull: false, defaultValue: 1, field: 'equivalence_threshold' },
  strictRanking: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'strict_ranking' },
  updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
}, { sequelize, modelName: 'PerformanceEquivalenceSetting', tableName: 'performance_equivalence_settings' });
