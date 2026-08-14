import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class AttendanceRecord extends Model {}
AttendanceRecord.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  shiftId: { type: DataTypes.INTEGER, field: 'shift_id' },
  locationId: { type: DataTypes.INTEGER, field: 'location_id' },
  latitude: { type: DataTypes.DECIMAL(10, 7) },
  longitude: { type: DataTypes.DECIMAL(10, 7) },
  locationAccuracy: { type: DataTypes.DECIMAL(8, 2), field: 'location_accuracy' },
  deviceMetadata: { type: DataTypes.JSON, field: 'device_metadata' },
  attendanceDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'attendance_date' },
  clockIn: { type: DataTypes.DATE, field: 'clock_in' },
  clockOut: { type: DataTypes.DATE, field: 'clock_out' },
  totalMinutes: { type: DataTypes.INTEGER, field: 'total_minutes' },
  workedMinutes: { type: DataTypes.INTEGER, field: 'worked_minutes' },
  lateMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'late_minutes' },
  overtimeMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'overtime_minutes' },
  scheduledStart: { type: DataTypes.TIME, field: 'scheduled_start' },
  scheduledEnd: { type: DataTypes.TIME, field: 'scheduled_end' },
  breakMinutesSnapshot: { type: DataTypes.INTEGER, field: 'break_minutes_snapshot' },
  graceMinutesSnapshot: { type: DataTypes.INTEGER, field: 'grace_minutes_snapshot' },
  overtimeAfterMinutesSnapshot: { type: DataTypes.INTEGER, field: 'overtime_after_minutes_snapshot' },
  status: { type: DataTypes.STRING(20), defaultValue: 'incomplete' },
  source: { type: DataTypes.STRING(20), defaultValue: 'web' }
}, { sequelize, modelName: 'AttendanceRecord', tableName: 'attendance_records' });
