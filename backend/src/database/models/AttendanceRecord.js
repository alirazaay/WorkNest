import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class AttendanceRecord extends Model {}
AttendanceRecord.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  attendanceDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'attendance_date' },
  clockIn: { type: DataTypes.DATE, field: 'clock_in' },
  clockOut: { type: DataTypes.DATE, field: 'clock_out' },
  totalMinutes: { type: DataTypes.INTEGER, field: 'total_minutes' },
  lateMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'late_minutes' },
  status: { type: DataTypes.STRING(20), defaultValue: 'incomplete' },
  source: { type: DataTypes.STRING(20), defaultValue: 'web' }
}, { sequelize, modelName: 'AttendanceRecord', tableName: 'attendance_records' });
