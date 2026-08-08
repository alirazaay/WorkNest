import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class SalaryComponent extends Model {}
SalaryComponent.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  code: { type: DataTypes.STRING(60), allowNull: false },
  name: { type: DataTypes.STRING(150), allowNull: false },
  type: { type: DataTypes.STRING(20), allowNull: false },
  category: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'other' },
  calculationType: { type: DataTypes.STRING(20), allowNull: false, field: 'calculation_type' },
  percentageBase: { type: DataTypes.STRING(50), field: 'percentage_base' },
  taxable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  recurring: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' }
}, { sequelize, modelName: 'SalaryComponent', tableName: 'salary_components' });
