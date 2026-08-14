import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class AttendanceHoliday extends Model {}
AttendanceHoliday.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  holidayDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'holiday_date' },
  name: { type: DataTypes.STRING(120), allowNull: false },
  isOptional: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_optional' },
  createdBy: { type: DataTypes.INTEGER, allowNull: false, field: 'created_by' }
}, { sequelize, modelName: 'AttendanceHoliday', tableName: 'attendance_holidays' });
