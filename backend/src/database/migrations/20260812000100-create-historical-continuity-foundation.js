export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.addColumn('employees', 'manager_employee_id', { type: DataTypes.INTEGER, allowNull: true, references: { model: 'employees', key: 'id' }, onDelete: 'SET NULL' });
  await queryInterface.addColumn('employees', 'source_metadata', { type: DataTypes.JSON, allowNull: true });

  await queryInterface.createTable('employee_history_events', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    employee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' },
    external_action_id: { type: DataTypes.STRING(64), allowNull: false },
    action_code: { type: DataTypes.STRING(40), allowNull: false },
    action_type: { type: DataTypes.STRING(80) },
    effective_date: { type: DataTypes.DATEONLY, allowNull: false },
    metadata: { type: DataTypes.JSON },
    source: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'historical_hr_fixture' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('employee_history_events', ['tenant_id', 'employee_id', 'effective_date'], { name: 'idx_history_events_tenant_employee_date' });
  await queryInterface.addIndex('employee_history_events', ['tenant_id', 'external_action_id'], { unique: true, name: 'uq_history_events_tenant_external_id' });

  await queryInterface.createTable('historical_performance_records', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    employee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' },
    cycle_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'performance_cycles', key: 'id' }, onDelete: 'RESTRICT' },
    source_performance_id: { type: DataTypes.STRING(64), allowNull: false },
    performance_date: { type: DataTypes.DATEONLY, allowNull: false },
    source_rating: { type: DataTypes.DECIMAL(3, 1), allowNull: false },
    normalized_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    source: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'historical_hr_fixture' },
    metadata: { type: DataTypes.JSON },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('historical_performance_records', ['tenant_id', 'source_performance_id'], { unique: true, name: 'uq_historical_perf_tenant_source_id' });
  await queryInterface.addIndex('historical_performance_records', ['tenant_id', 'employee_id', 'cycle_id'], { name: 'idx_historical_perf_tenant_employee_cycle' });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('historical_performance_records');
  await queryInterface.dropTable('employee_history_events');
  await queryInterface.removeColumn('employees', 'source_metadata');
  await queryInterface.removeColumn('employees', 'manager_employee_id');
}
