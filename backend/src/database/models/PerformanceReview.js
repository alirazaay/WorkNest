import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceReview extends Model {}
PerformanceReview.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  cycleId: { type: DataTypes.INTEGER, allowNull: false, field: 'cycle_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  reviewerId: { type: DataTypes.INTEGER, allowNull: false, field: 'reviewer_id' },
  reviewType: { type: DataTypes.STRING(20), allowNull: false, field: 'review_type' },
  overallScore: { type: DataTypes.DECIMAL(7, 3), field: 'overall_score' },
  ratingBand: { type: DataTypes.STRING(100), field: 'rating_band' },
  strengths: DataTypes.TEXT,
  improvementAreas: { type: DataTypes.TEXT, field: 'improvement_areas' },
  comments: DataTypes.TEXT,
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
  submittedAt: { type: DataTypes.DATE, field: 'submitted_at' }
}, { sequelize, modelName: 'PerformanceReview', tableName: 'performance_reviews' });
