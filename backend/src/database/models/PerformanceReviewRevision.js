import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceReviewRevision extends Model {}
PerformanceReviewRevision.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  reviewId: { type: DataTypes.INTEGER, allowNull: false, field: 'review_id' },
  version: { type: DataTypes.INTEGER, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'original' },
  snapshot: { type: DataTypes.JSON, allowNull: false },
  createdBy: { type: DataTypes.INTEGER, allowNull: false, field: 'created_by' }
}, { sequelize, modelName: 'PerformanceReviewRevision', tableName: 'performance_review_revisions', updatedAt: false });
