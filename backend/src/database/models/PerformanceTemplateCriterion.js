import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceTemplateCriterion extends Model {}
PerformanceTemplateCriterion.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  templateId: { type: DataTypes.INTEGER, allowNull: false, field: 'template_id' },
  criterionId: { type: DataTypes.INTEGER, allowNull: false, field: 'criterion_id' },
  weight: { type: DataTypes.DECIMAL(6, 3), allowNull: false },
  ratingScaleMin: { type: DataTypes.DECIMAL(6, 2), field: 'rating_scale_min' },
  ratingScaleMax: { type: DataTypes.DECIMAL(6, 2), field: 'rating_scale_max' },
  evidenceRequired: { type: DataTypes.BOOLEAN, field: 'evidence_required' },
  sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'sort_order' }
}, { sequelize, modelName: 'PerformanceTemplateCriterion', tableName: 'performance_template_criteria' });
