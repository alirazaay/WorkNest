import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class ShiftWeeklySchedule extends Model {}
ShiftWeeklySchedule.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  shiftId: { type: DataTypes.INTEGER, allowNull: false, field: 'shift_id' },
  weekday: { type: DataTypes.INTEGER, allowNull: false },
  isWorkingDay: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_working_day' }
}, { sequelize, modelName: 'ShiftWeeklySchedule', tableName: 'shift_weekly_schedules' });
