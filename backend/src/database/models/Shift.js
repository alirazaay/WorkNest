import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Shift extends Model {}
Shift.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  name: { type: DataTypes.STRING(80), allowNull: false },
  startTime: { type: DataTypes.TIME, allowNull: false, field: 'start_time' },
  endTime: { type: DataTypes.TIME, allowNull: false, field: 'end_time' },
  graceMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'grace_minutes' },
  breakMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'break_minutes' },
  isOvernight: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_overnight' },
  overtimeAfterMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'overtime_after_minutes' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  createdBy: { type: DataTypes.INTEGER, allowNull: false, field: 'created_by' }
}, { sequelize, modelName: 'Shift', tableName: 'shifts' });
