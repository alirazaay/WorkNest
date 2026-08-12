export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('training_needs', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    employee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' },
    cycle_id: { type: DataTypes.INTEGER, references: { model: 'performance_cycles', key: 'id' }, onDelete: 'SET NULL' },
    source_cycle_id: { type: DataTypes.INTEGER, references: { model: 'performance_cycles', key: 'id' }, onDelete: 'SET NULL' },
    signal_code: { type: DataTypes.STRING(80) },
    skill_area: { type: DataTypes.STRING(150), allowNull: false },
    priority: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'medium' },
    reason: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'identified' },
    recommended_training: { type: DataTypes.TEXT },
    source_type: { type: DataTypes.STRING(50), allowNull: false },
    source_reference_id: { type: DataTypes.STRING(80) },
    continuity_gap_score: { type: DataTypes.DECIMAL(5, 2) },
    risk_level: { type: DataTypes.STRING(20) },
    created_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('training_needs', ['tenant_id', 'employee_id', 'status'], { name: 'idx_training_needs_tenant_employee_status' });
  await queryInterface.addIndex('training_needs', ['tenant_id', 'signal_code', 'source_reference_id'], { name: 'idx_training_needs_tenant_signal_reference' });
}

export async function down(queryInterface) { await queryInterface.dropTable('training_needs'); }
