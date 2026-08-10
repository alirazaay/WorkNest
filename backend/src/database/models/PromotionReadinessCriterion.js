import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PromotionReadinessCriterion extends Model {}
PromotionReadinessCriterion.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, profileId: { type: DataTypes.INTEGER, allowNull: false, field: 'profile_id' }, criterionName: { type: DataTypes.STRING(120), allowNull: false, field: 'criterion_name' }, weight: { type: DataTypes.DECIMAL(6, 3), allowNull: false }, requiredLevel: { type: DataTypes.STRING(80), field: 'required_level' }
}, { sequelize, modelName: 'PromotionReadinessCriterion', tableName: 'promotion_readiness_criteria' });
