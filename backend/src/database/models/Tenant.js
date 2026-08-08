import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Tenant extends Model {}
Tenant.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  companyName: { type: DataTypes.STRING(150), allowNull: false, field: 'company_name' },
  slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
  industry: DataTypes.STRING(100), companySize: { type: DataTypes.STRING(20), field: 'company_size' }, plan: { type: DataTypes.STRING(20), defaultValue: 'starter' },
  employeeLimit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10, field: 'employee_limit' },
  logoUrl: { type: DataTypes.TEXT, field: 'logo_url' }, address: DataTypes.TEXT,
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' }
}, { sequelize, modelName: 'Tenant', tableName: 'tenants' });
