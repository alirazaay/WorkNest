export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.addColumn('performance_goals', 'previous_goal_id', { type: DataTypes.INTEGER, allowNull: true, references: { model: 'performance_goals', key: 'id' }, onDelete: 'SET NULL' });
  await queryInterface.addColumn('performance_goals', 'continuity_status', { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'not_applicable' });
  await queryInterface.addIndex('performance_goals', ['tenant_id', 'previous_goal_id'], { name: 'idx_goals_tenant_previous_goal' });
}

export async function down(queryInterface) { await queryInterface.removeColumn('performance_goals', 'continuity_status'); await queryInterface.removeColumn('performance_goals', 'previous_goal_id'); }
