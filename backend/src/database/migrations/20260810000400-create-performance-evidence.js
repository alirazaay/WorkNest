export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('performance_evidence', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    cycle_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'performance_cycles', key: 'id' }, onDelete: 'RESTRICT' },
    employee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'RESTRICT' },
    goal_id: { type: DataTypes.INTEGER, references: { model: 'performance_goals', key: 'id' }, onDelete: 'SET NULL' },
    criterion_id: { type: DataTypes.INTEGER, references: { model: 'performance_criteria', key: 'id' }, onDelete: 'SET NULL' },
    evidence_type: { type: DataTypes.STRING(50), allowNull: false }, title: { type: DataTypes.STRING(180), allowNull: false }, description: DataTypes.TEXT,
    metric_value: DataTypes.STRING(100), file_name: DataTypes.STRING(255), storage_key: DataTypes.STRING(500), mime_type: DataTypes.STRING(100), file_size: DataTypes.INTEGER,
    source_type: DataTypes.STRING(50), source_id: DataTypes.INTEGER,
    submitted_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' },
    verified_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
    verification_status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' }, event_date: { type: DataTypes.DATEONLY, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('performance_evidence', ['tenant_id', 'employee_id', 'cycle_id'], { name: 'idx_performance_evidence_employee_cycle' });
  await queryInterface.addIndex('performance_evidence', ['tenant_id', 'verification_status'], { name: 'idx_performance_evidence_verification' });
}
export async function down(queryInterface) { await queryInterface.dropTable('performance_evidence'); }
