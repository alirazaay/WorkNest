export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('attendance_records', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    employee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' },
    attendance_date: { type: DataTypes.DATEONLY, allowNull: false },
    clock_in: { type: DataTypes.DATE, allowNull: true },
    clock_out: { type: DataTypes.DATE, allowNull: true },
    total_minutes: { type: DataTypes.INTEGER, allowNull: true },
    late_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'incomplete' },
    source: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'web' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('attendance_records', ['tenant_id', 'employee_id', 'attendance_date'], { unique: true, name: 'uq_attendance_employee_date' });
  await queryInterface.addIndex('attendance_records', ['tenant_id', 'attendance_date'], { name: 'idx_attendance_tenant_date' });
  await queryInterface.addIndex('attendance_records', ['tenant_id', 'employee_id', 'attendance_date'], { name: 'idx_attendance_employee_date' });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('attendance_records');
}
