import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class PerformanceEquivalenceMember extends Model {}
PerformanceEquivalenceMember.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' },
  groupId: { type: DataTypes.INTEGER, allowNull: false, field: 'group_id' },
  employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  finalScore: { type: DataTypes.DECIMAL(7, 3), allowNull: false, field: 'final_score' }
}, { sequelize, modelName: 'PerformanceEquivalenceMember', tableName: 'performance_equivalence_members', timestamps: false });
