export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('performance_equivalence_settings', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenant_id: { type: DataTypes.INTEGER, allowNull: false, unique: true, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    equivalence_threshold: { type: DataTypes.DECIMAL(7, 3), allowNull: false, defaultValue: 1 }, strict_ranking: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, updated_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.createTable('performance_equivalence_groups', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' }, cycle_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'performance_cycles', key: 'id' }, onDelete: 'RESTRICT' }, rating_band_id: { type: DataTypes.INTEGER, references: { model: 'performance_rating_bands', key: 'id' }, onDelete: 'SET NULL' }, rating_band: DataTypes.STRING(100), threshold_used: { type: DataTypes.DECIMAL(7, 3), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.createTable('performance_equivalence_members', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, group_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'performance_equivalence_groups', key: 'id' }, onDelete: 'CASCADE' }, employee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'RESTRICT' }, final_score: { type: DataTypes.DECIMAL(7, 3), allowNull: false }
  });
  await queryInterface.addIndex('performance_equivalence_groups', ['tenant_id', 'cycle_id'], { name: 'idx_performance_equivalence_groups_cycle' });
  await queryInterface.addIndex('performance_equivalence_members', ['group_id', 'employee_id'], { unique: true, name: 'uq_performance_equivalence_member' });
}
export async function down(queryInterface) { await queryInterface.dropTable('performance_equivalence_members'); await queryInterface.dropTable('performance_equivalence_groups'); await queryInterface.dropTable('performance_equivalence_settings'); }
