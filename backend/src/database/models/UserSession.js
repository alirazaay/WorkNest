import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class UserSession extends Model {}
UserSession.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' }, tenantId: { type: DataTypes.INTEGER, field: 'tenant_id' },
  refreshTokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'refresh_token_hash' }, userAgent: { type: DataTypes.STRING(500), field: 'user_agent' },
  ipAddress: { type: DataTypes.STRING(45), field: 'ip_address' }, expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' },
  lastUsedAt: { type: DataTypes.DATE, field: 'last_used_at' }, revokedAt: { type: DataTypes.DATE, field: 'revoked_at' }
}, { sequelize, modelName: 'UserSession', tableName: 'user_sessions' });
