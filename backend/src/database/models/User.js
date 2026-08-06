import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class User extends Model {}
User.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, field: 'tenant_id' }, name: { type: DataTypes.STRING(150), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true }, passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
  role: { type: DataTypes.STRING(20), defaultValue: 'employee' }, status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  lastLoginAt: { type: DataTypes.DATE, field: 'last_login_at' }, emailVerifiedAt: { type: DataTypes.DATE, field: 'email_verified_at' }
}, { sequelize, modelName: 'User', tableName: 'users' });
