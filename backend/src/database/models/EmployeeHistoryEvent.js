import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class EmployeeHistoryEvent extends Model {}

EmployeeHistoryEvent.init({
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  externalActionId: { type: DataTypes.STRING(64), allowNull: false, field: 'external_action_id' },
  actionCode: { type: DataTypes.STRING(40), allowNull: false, field: 'action_code' },
  actionType: { type: DataTypes.STRING(80), field: 'action_type' },
  effectiveDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_date' },
  metadata: DataTypes.JSON,
  source: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'historical_hr_fixture' }
}, { sequelize, modelName: 'EmployeeHistoryEvent', tableName: 'employee_history_events' });
