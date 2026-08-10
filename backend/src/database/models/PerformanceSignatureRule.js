import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceSignatureRule extends Model {}
PerformanceSignatureRule.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  name: { type: DataTypes.STRING(100), allowNull: false },
  description: DataTypes.TEXT,
  categories: { type: DataTypes.JSON, allowNull: false },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' }
}, { sequelize, modelName: 'PerformanceSignatureRule', tableName: 'performance_signature_rules' });
