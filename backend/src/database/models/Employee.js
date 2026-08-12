import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class Employee extends Model {}
Employee.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, userId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'user_id' },
  departmentId: { type: DataTypes.INTEGER, field: 'department_id' }, employeeCode: { type: DataTypes.STRING(30), allowNull: false, field: 'employee_code' },
  designation: DataTypes.STRING(150), phone: DataTypes.STRING(30), cnic: DataTypes.STRING(30), dateOfBirth: { type: DataTypes.DATEONLY, field: 'date_of_birth' }, gender: DataTypes.STRING(20), address: DataTypes.TEXT,
  joiningDate: { type: DataTypes.DATEONLY, field: 'joining_date' }, employmentType: { type: DataTypes.STRING(20), defaultValue: 'full-time', field: 'employment_type' }, employmentStatus: { type: DataTypes.STRING(20), defaultValue: 'active', field: 'employment_status' },
  terminationDate: { type: DataTypes.DATEONLY, field: 'termination_date' }, terminationReason: { type: DataTypes.TEXT, field: 'termination_reason' },
  managerEmployeeId: { type: DataTypes.INTEGER, field: 'manager_employee_id' }, sourceMetadata: { type: DataTypes.JSON, field: 'source_metadata' }
}, { sequelize, modelName: 'Employee', tableName: 'employees' });
