import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class EmployeePromotionAssessment extends Model {}
EmployeePromotionAssessment.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, cycleId: { type: DataTypes.INTEGER, allowNull: false, field: 'cycle_id' }, employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' }, promotionProfileId: { type: DataTypes.INTEGER, allowNull: false, field: 'promotion_profile_id' }, readinessScore: { type: DataTypes.DECIMAL(7, 3), allowNull: false, field: 'readiness_score' }, recommendation: { type: DataTypes.STRING(40), allowNull: false }, assessedBy: { type: DataTypes.INTEGER, allowNull: false, field: 'assessed_by' }, assessmentSnapshot: { type: DataTypes.JSON, allowNull: false, field: 'assessment_snapshot' }, comments: DataTypes.TEXT
}, { sequelize, modelName: 'EmployeePromotionAssessment', tableName: 'employee_promotion_assessments' });
