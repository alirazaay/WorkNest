export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  const tenant = { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' };
  const timestamps = { created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') } };
  await queryInterface.createTable('performance_criteria', { id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenant_id: tenant, name: { type: DataTypes.STRING(150), allowNull: false }, description: DataTypes.TEXT, category: { type: DataTypes.STRING(80), allowNull: false }, weight: { type: DataTypes.DECIMAL(6, 3), allowNull: false, defaultValue: 0 }, rating_scale_min: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 }, rating_scale_max: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 5 }, evidence_required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }, is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }, ...timestamps });
  await queryInterface.createTable('performance_templates', { id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenant_id: tenant, name: { type: DataTypes.STRING(180), allowNull: false }, job_role: DataTypes.STRING(150), description: DataTypes.TEXT, rating_scale_min: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 }, rating_scale_max: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 5 }, status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' }, created_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' }, ...timestamps });
  await queryInterface.createTable('performance_template_criteria', { id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenant_id: tenant, template_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'performance_templates', key: 'id' }, onDelete: 'CASCADE' }, criterion_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'performance_criteria', key: 'id' }, onDelete: 'RESTRICT' }, weight: { type: DataTypes.DECIMAL(6, 3), allowNull: false }, rating_scale_min: DataTypes.DECIMAL(6, 2), rating_scale_max: DataTypes.DECIMAL(6, 2), evidence_required: DataTypes.BOOLEAN, sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, ...timestamps });
  await queryInterface.addIndex('performance_criteria', ['tenant_id', 'name'], { unique: true, name: 'uq_performance_criteria_tenant_name' });
  await queryInterface.addIndex('performance_templates', ['tenant_id', 'name'], { unique: true, name: 'uq_performance_templates_tenant_name' });
  await queryInterface.addIndex('performance_template_criteria', ['tenant_id', 'template_id', 'criterion_id'], { unique: true, name: 'uq_performance_template_criterion' });
  await queryInterface.addIndex('performance_template_criteria', ['tenant_id', 'template_id', 'sort_order'], { name: 'idx_performance_template_criteria_order' });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('performance_template_criteria');
  await queryInterface.dropTable('performance_templates');
  await queryInterface.dropTable('performance_criteria');
}
