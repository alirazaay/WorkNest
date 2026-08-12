import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceCycleLink extends Model {}

PerformanceCycleLink.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  previousCycleId: { type: DataTypes.INTEGER, allowNull: false, field: 'previous_cycle_id' },
  currentCycleId: { type: DataTypes.INTEGER, allowNull: false, field: 'current_cycle_id' },
  linkType: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'year_over_year' },
  metadata: DataTypes.JSON
}, { sequelize, modelName: 'PerformanceCycleLink', tableName: 'performance_cycle_links' });
