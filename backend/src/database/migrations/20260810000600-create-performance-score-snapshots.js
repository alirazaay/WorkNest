export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('performance_score_snapshots', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    cycle_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'performance_cycles', key: 'id' }, onDelete: 'RESTRICT' },
    employee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'RESTRICT' },
    final_score: { type: DataTypes.DECIMAL(7, 3), allowNull: false }, rating_band: DataTypes.STRING(100), calculation_details: { type: DataTypes.JSON, allowNull: false },
    generated_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' }, generated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('performance_score_snapshots', ['tenant_id', 'cycle_id', 'employee_id'], { unique: true, name: 'uq_performance_score_snapshot_employee' });
}
export async function down(queryInterface) { await queryInterface.dropTable('performance_score_snapshots'); }
