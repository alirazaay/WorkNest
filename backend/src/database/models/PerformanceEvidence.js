import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceEvidence extends Model {}
PerformanceEvidence.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  cycleId: { type: DataTypes.INTEGER, allowNull: false, field: 'cycle_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  goalId: { type: DataTypes.INTEGER, field: 'goal_id' },
  criterionId: { type: DataTypes.INTEGER, field: 'criterion_id' },
  evidenceType: { type: DataTypes.STRING(50), allowNull: false, field: 'evidence_type' },
  title: { type: DataTypes.STRING(180), allowNull: false },
  description: DataTypes.TEXT,
  metricValue: { type: DataTypes.STRING(100), field: 'metric_value' },
  fileName: { type: DataTypes.STRING(255), field: 'file_name' },
  storageKey: { type: DataTypes.STRING(500), field: 'storage_key' },
  mimeType: { type: DataTypes.STRING(100), field: 'mime_type' },
  fileSize: { type: DataTypes.INTEGER, field: 'file_size' },
  sourceType: { type: DataTypes.STRING(50), field: 'source_type' },
  sourceId: { type: DataTypes.INTEGER, field: 'source_id' },
  submittedBy: { type: DataTypes.INTEGER, allowNull: false, field: 'submitted_by' },
  verifiedBy: { type: DataTypes.INTEGER, field: 'verified_by' },
  verificationStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending', field: 'verification_status' },
  eventDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'event_date' }
}, { sequelize, modelName: 'PerformanceEvidence', tableName: 'performance_evidence' });
