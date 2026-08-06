import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Department extends Model {}
Department.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  name: { type: DataTypes.STRING(150), allowNull: false },
  headEmployeeId: { type: DataTypes.INTEGER, field: 'head_employee_id' }
}, { sequelize, modelName: 'Department', tableName: 'departments' });
