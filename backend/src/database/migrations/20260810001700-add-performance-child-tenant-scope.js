export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.addColumn('performance_equivalence_members', 'tenant_id', { type: DataTypes.INTEGER, allowNull: true });
  await queryInterface.sequelize.query('UPDATE performance_equivalence_members m INNER JOIN performance_equivalence_groups g ON g.id = m.group_id SET m.tenant_id = g.tenant_id');
  await queryInterface.changeColumn('performance_equivalence_members', 'tenant_id', { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' });
  await queryInterface.addIndex('performance_equivalence_members', ['tenant_id', 'group_id', 'employee_id'], { name: 'idx_performance_equivalence_members_tenant' });

  await queryInterface.addColumn('promotion_readiness_criteria', 'tenant_id', { type: DataTypes.INTEGER, allowNull: true });
  await queryInterface.sequelize.query('UPDATE promotion_readiness_criteria c INNER JOIN promotion_profiles p ON p.id = c.profile_id SET c.tenant_id = p.tenant_id');
  await queryInterface.changeColumn('promotion_readiness_criteria', 'tenant_id', { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' });
  await queryInterface.addIndex('promotion_readiness_criteria', ['tenant_id', 'profile_id', 'criterion_name'], { name: 'idx_promotion_readiness_criteria_tenant' });
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('promotion_readiness_criteria', 'idx_promotion_readiness_criteria_tenant');
  await queryInterface.removeColumn('promotion_readiness_criteria', 'tenant_id');
  await queryInterface.removeIndex('performance_equivalence_members', 'idx_performance_equivalence_members_tenant');
  await queryInterface.removeColumn('performance_equivalence_members', 'tenant_id');
}
