import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class AttendanceLocation extends Model {}
AttendanceLocation.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  name: { type: DataTypes.STRING(100), allowNull: false },
  latitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
  longitude: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
  radiusMeters: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 150, field: 'radius_meters' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  createdBy: { type: DataTypes.INTEGER, allowNull: false, field: 'created_by' }
}, { sequelize, modelName: 'AttendanceLocation', tableName: 'attendance_locations' });
