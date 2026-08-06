import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class LeaveRequest extends Model {}
LeaveRequest.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' }, leaveTypeId: { type: DataTypes.INTEGER, allowNull: false, field: 'leave_type_id' }, fromDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'from_date' }, toDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'to_date' }, totalDays: { type: DataTypes.INTEGER, allowNull: false, field: 'total_days' }, reason: DataTypes.TEXT, status: { type: DataTypes.STRING(20), defaultValue: 'pending' }, reviewedBy: { type: DataTypes.INTEGER, field: 'reviewed_by' }, reviewerComment: { type: DataTypes.TEXT, field: 'reviewer_comment' }, reviewedAt: { type: DataTypes.DATE, field: 'reviewed_at' }, appliedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'applied_at' }
}, { sequelize, modelName: 'LeaveRequest', tableName: 'leave_requests' });
