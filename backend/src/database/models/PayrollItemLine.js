import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PayrollItemLine extends Model {}
PayrollItemLine.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, payrollItemId: { type: DataTypes.INTEGER, allowNull: false, field: 'payroll_item_id' }, lineType: { type: DataTypes.STRING(20), allowNull: false, field: 'line_type' }, label: { type: DataTypes.STRING(150), allowNull: false }, amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false }
}, { sequelize, modelName: 'PayrollItemLine', tableName: 'payroll_item_lines' });
