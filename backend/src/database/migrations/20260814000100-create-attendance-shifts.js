export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('shifts', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    name: { type: DataTypes.STRING(80), allowNull: false },
    start_time: { type: DataTypes.TIME, allowNull: false },
    end_time: { type: DataTypes.TIME, allowNull: false },
    grace_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    break_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    is_overnight: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    overtime_after_minutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.createTable('shift_weekly_schedules', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    shift_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'shifts', key: 'id' }, onDelete: 'CASCADE' },
    weekday: { type: DataTypes.TINYINT, allowNull: false },
    is_working_day: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.createTable('employee_shift_assignments', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    employee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' },
    shift_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'shifts', key: 'id' }, onDelete: 'RESTRICT' },
    effective_from: { type: DataTypes.DATEONLY, allowNull: false },
    effective_to: { type: DataTypes.DATEONLY },
    assigned_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('shifts', ['tenant_id', 'name'], { unique: true, name: 'uq_shifts_tenant_name' });
  await queryInterface.addIndex('shift_weekly_schedules', ['tenant_id', 'shift_id', 'weekday'], { unique: true, name: 'uq_shift_weekday' });
  await queryInterface.addIndex('employee_shift_assignments', ['tenant_id', 'employee_id', 'effective_from'], { name: 'idx_employee_shift_effective' });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('employee_shift_assignments');
  await queryInterface.dropTable('shift_weekly_schedules');
  await queryInterface.dropTable('shifts');
}
