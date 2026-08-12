import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class TrainingNeed extends Model {}

TrainingNeed.init({
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  cycleId: { type: DataTypes.INTEGER, field: 'cycle_id' },
  sourceCycleId: { type: DataTypes.INTEGER, field: 'source_cycle_id' },
  signalCode: { type: DataTypes.STRING(80), field: 'signal_code' },
  skillArea: { type: DataTypes.STRING(150), allowNull: false, field: 'skill_area' },
  priority: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'medium' },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'identified' },
  recommendedTraining: { type: DataTypes.TEXT, field: 'recommended_training' },
  sourceType: { type: DataTypes.STRING(50), allowNull: false, field: 'source_type' },
  sourceReferenceId: { type: DataTypes.STRING(80), field: 'source_reference_id' },
  continuityGapScore: { type: DataTypes.DECIMAL(5, 2), field: 'continuity_gap_score' },
  riskLevel: { type: DataTypes.STRING(20), field: 'risk_level' },
  createdBy: { type: DataTypes.INTEGER, allowNull: false, field: 'created_by' }
}, { sequelize, modelName: 'TrainingNeed', tableName: 'training_needs' });
