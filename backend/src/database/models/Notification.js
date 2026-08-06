import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Notification extends Model {}
Notification.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' }, type: { type: DataTypes.STRING(50), allowNull: false }, title: { type: DataTypes.STRING(150), allowNull: false }, message: { type: DataTypes.TEXT, allowNull: false }, entityType: { type: DataTypes.STRING(50), field: 'entity_type' }, entityId: { type: DataTypes.INTEGER, field: 'entity_id' }, isRead: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_read' }, readAt: { type: DataTypes.DATE, field: 'read_at' }
}, { sequelize, modelName: 'Notification', tableName: 'notifications' });
