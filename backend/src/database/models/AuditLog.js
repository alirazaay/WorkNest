import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class AuditLog extends Model {}

AuditLog.init({
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, field: 'tenant_id' },
  actorUserId: { type: DataTypes.INTEGER, field: 'actor_user_id' },
  action: { type: DataTypes.STRING(100), allowNull: false },
  entityType: { type: DataTypes.STRING(50), allowNull: false, field: 'entity_type' },
  entityId: { type: DataTypes.STRING(64), field: 'entity_id' },
  beforeData: { type: DataTypes.JSON, field: 'before_data' },
  afterData: { type: DataTypes.JSON, field: 'after_data' },
  ipAddress: { type: DataTypes.STRING(45), field: 'ip_address' },
  requestId: { type: DataTypes.STRING(64), field: 'request_id' },
  // The database column is `created_at`, while the application API uses
  // `createdAt`. Declare the field explicitly so Sequelize never generates
  // a query for a non-existent `createdAt` column.
  createdAt: { type: DataTypes.DATE, field: 'created_at', allowNull: false, defaultValue: DataTypes.NOW }
}, { sequelize, modelName: 'AuditLog', tableName: 'audit_logs', timestamps: false });
