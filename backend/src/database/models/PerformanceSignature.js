import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceSignature extends Model {}
PerformanceSignature.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  cycleId: { type: DataTypes.INTEGER, allowNull: false, field: 'cycle_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  signatureRuleId: { type: DataTypes.INTEGER, field: 'signature_rule_id' },
  signatureName: { type: DataTypes.STRING(100), allowNull: false, field: 'signature_name' },
  strongestFactors: { type: DataTypes.JSON, allowNull: false, field: 'strongest_factors' },
  signatureScore: { type: DataTypes.DECIMAL(7, 3), allowNull: false, field: 'signature_score' },
  calculationDetails: { type: DataTypes.JSON, allowNull: false, field: 'calculation_details' },
  generatedBy: { type: DataTypes.INTEGER, allowNull: false, field: 'generated_by' },
  generatedAt: { type: DataTypes.DATE, allowNull: false, field: 'generated_at' }
}, { sequelize, modelName: 'PerformanceSignature', tableName: 'performance_signatures', updatedAt: false });
