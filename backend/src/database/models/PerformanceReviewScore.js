import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceReviewScore extends Model {}
PerformanceReviewScore.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  reviewId: { type: DataTypes.INTEGER, allowNull: false, field: 'review_id' },
  criterionId: { type: DataTypes.INTEGER, allowNull: false, field: 'criterion_id' },
  rawScore: { type: DataTypes.DECIMAL(7, 3), allowNull: false, field: 'raw_score' },
  weightedScore: { type: DataTypes.DECIMAL(7, 3), field: 'weighted_score' },
  reviewerComment: { type: DataTypes.TEXT, field: 'reviewer_comment' },
  evidenceCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'evidence_count' }
}, { sequelize, modelName: 'PerformanceReviewScore', tableName: 'performance_review_scores' });
