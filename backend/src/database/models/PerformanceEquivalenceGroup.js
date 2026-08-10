import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceEquivalenceGroup extends Model {}
PerformanceEquivalenceGroup.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  cycleId: { type: DataTypes.INTEGER, allowNull: false, field: 'cycle_id' },
  ratingBandId: { type: DataTypes.INTEGER, field: 'rating_band_id' },
  ratingBand: { type: DataTypes.STRING(100), field: 'rating_band' },
  thresholdUsed: { type: DataTypes.DECIMAL(7, 3), allowNull: false, field: 'threshold_used' }
}, { sequelize, modelName: 'PerformanceEquivalenceGroup', tableName: 'performance_equivalence_groups' });
