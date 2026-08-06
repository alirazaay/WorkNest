export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  await queryInterface.createTable('departments', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    name: { type: DataTypes.STRING(150), allowNull: false },
    head_employee_id: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.createTable('employees', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
    department_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'departments', key: 'id' }, onDelete: 'SET NULL' },
    employee_code: { type: DataTypes.STRING(30), allowNull: false }, designation: { type: DataTypes.STRING(150) }, phone: { type: DataTypes.STRING(30) }, cnic: { type: DataTypes.STRING(30) },
    date_of_birth: { type: DataTypes.DATEONLY }, gender: { type: DataTypes.STRING(20) }, address: { type: DataTypes.TEXT }, joining_date: { type: DataTypes.DATEONLY },
    employment_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'full-time' }, employment_status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
    termination_date: { type: DataTypes.DATEONLY }, termination_reason: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.createTable('employee_salary_structures', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    employee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' }, effective_from: { type: DataTypes.DATEONLY, allowNull: false }, effective_to: { type: DataTypes.DATEONLY },
    base_salary: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }, house_allowance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }, transport_allowance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    medical_allowance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }, tax_deduction: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 }, other_deductions: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.createTable('employee_documents', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    employee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' }, document_type: { type: DataTypes.STRING(50), allowNull: false }, file_name: { type: DataTypes.STRING(255), allowNull: false },
    storage_key: { type: DataTypes.STRING(500), allowNull: false }, mime_type: { type: DataTypes.STRING(100), allowNull: false }, file_size: { type: DataTypes.INTEGER, allowNull: false }, uploaded_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addConstraint('departments', { fields: ['head_employee_id'], type: 'foreign key', name: 'fk_departments_head_employee', references: { table: 'employees', field: 'id' }, onDelete: 'SET NULL' });
  await queryInterface.addIndex('departments', ['tenant_id', 'name'], { unique: true, name: 'uq_departments_tenant_name' });
  await queryInterface.addIndex('employees', ['tenant_id', 'employee_code'], { unique: true, name: 'uq_employees_tenant_code' });
  await queryInterface.addIndex('employees', ['tenant_id', 'department_id', 'employment_status'], { name: 'idx_employees_tenant_department_status' });
  await queryInterface.addIndex('employee_salary_structures', ['tenant_id', 'employee_id', 'effective_from'], { name: 'idx_salary_employee_effective' });
  await queryInterface.addIndex('employee_documents', ['tenant_id', 'employee_id'], { name: 'idx_documents_employee' });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('employee_documents');
  await queryInterface.dropTable('employee_salary_structures');
  await queryInterface.dropTable('employees');
  await queryInterface.dropTable('departments');
}
