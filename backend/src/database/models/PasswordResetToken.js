import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PasswordResetToken extends Model {}
PasswordResetToken.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, field: 'token_hash' }, expiresAt: { type: DataTypes.DATE, allowNull: false, field: 'expires_at' }, usedAt: { type: DataTypes.DATE, field: 'used_at' }
}, { sequelize, modelName: 'PasswordResetToken', tableName: 'password_reset_tokens' });
