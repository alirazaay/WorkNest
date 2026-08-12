import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class HistoricalPerformanceRecord extends Model {}

HistoricalPerformanceRecord.init({
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  cycleId: { type: DataTypes.INTEGER, allowNull: false, field: 'cycle_id' },
  sourcePerformanceId: { type: DataTypes.STRING(64), allowNull: false, field: 'source_performance_id' },
  performanceDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'performance_date' },
  sourceRating: { type: DataTypes.DECIMAL(3, 1), allowNull: false, field: 'source_rating' },
  normalizedScore: { type: DataTypes.DECIMAL(5, 2), allowNull: false, field: 'normalized_score' },
  source: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'historical_hr_fixture' },
  metadata: DataTypes.JSON
}, { sequelize, modelName: 'HistoricalPerformanceRecord', tableName: 'historical_performance_records' });
