import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Invitation extends Model {}
Invitation.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  email: { type: DataTypes.STRING(255), allowNull: false }, name: { type: DataTypes.STRING(150), allowNull: false }, role: { type: DataTypes.STRING(20), defaultValue: 'employee' },
  departmentId: { type: DataTypes.INTEGER, field: 'department_id' }, tokenHash: { type: DataTypes.STRING(64), allowNull: false, field: 'token_hash' },
  expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' }, acceptedAt: { type: DataTypes.DATE, field: 'accepted_at' }, invitedBy: { type: DataTypes.INTEGER, allowNull: false, field: 'invited_by' }
}, { sequelize, modelName: 'Invitation', tableName: 'invitations' });
