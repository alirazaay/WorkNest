import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PromotionProfile extends Model {}
PromotionProfile.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, name: { type: DataTypes.STRING(150), allowNull: false }, targetRole: { type: DataTypes.STRING(150), allowNull: false, field: 'target_role' }, description: DataTypes.TEXT, isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' }, createdBy: { type: DataTypes.INTEGER, allowNull: false, field: 'created_by' }
}, { sequelize, modelName: 'PromotionProfile', tableName: 'promotion_profiles' });
