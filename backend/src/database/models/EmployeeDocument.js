import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../../config/database.js';

export class EmployeeDocument extends Model {}
EmployeeDocument.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenantId: { type: DataTypes.INTEGER, allowNull: false, field: 'tenant_id' }, employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
  documentType: { type: DataTypes.STRING(50), allowNull: false, field: 'document_type' }, fileName: { type: DataTypes.STRING(255), allowNull: false, field: 'file_name' }, storageKey: { type: DataTypes.STRING(500), allowNull: false, field: 'storage_key' },
  mimeType: { type: DataTypes.STRING(100), allowNull: false, field: 'mime_type' }, fileSize: { type: DataTypes.INTEGER, allowNull: false, field: 'file_size' }, uploadedBy: { type: DataTypes.INTEGER, allowNull: false, field: 'uploaded_by' }
}, { sequelize, modelName: 'EmployeeDocument', tableName: 'employee_documents' });
