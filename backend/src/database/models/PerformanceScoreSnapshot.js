import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceScoreSnapshot extends Model {}
PerformanceScoreSnapshot.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  cycleId: { type: DataTypes.INTEGER, allowNull: false, field: 'cycle_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  finalScore: { type: DataTypes.DECIMAL(7, 3), allowNull: false, field: 'final_score' },
  evidenceCoveragePercentage: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0, field: 'evidence_coverage_percentage' },
  evidenceConfidence: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'low', field: 'evidence_confidence' },
  ratingBand: { type: DataTypes.STRING(100), field: 'rating_band' },
  calculationDetails: { type: DataTypes.JSON, allowNull: false, field: 'calculation_details' },
  generatedBy: { type: DataTypes.INTEGER, allowNull: false, field: 'generated_by' },
  generatedAt: { type: DataTypes.DATE, allowNull: false, field: 'generated_at' }
}, { sequelize, modelName: 'PerformanceScoreSnapshot', tableName: 'performance_score_snapshots', updatedAt: false });
