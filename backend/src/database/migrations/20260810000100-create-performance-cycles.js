export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('performance_cycles', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    name: { type: DataTypes.STRING(180), allowNull: false },
    cycle_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'annual' },
    year: { type: DataTypes.SMALLINT, allowNull: false },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: false },
    goal_setting_start: { type: DataTypes.DATEONLY },
    goal_setting_end: { type: DataTypes.DATEONLY },
    review_start: { type: DataTypes.DATEONLY },
    review_end: { type: DataTypes.DATEONLY },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
    created_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('performance_cycles', ['tenant_id', 'year', 'cycle_type'], { unique: true, name: 'uq_performance_cycles_tenant_year_type' });
  await queryInterface.addIndex('performance_cycles', ['tenant_id', 'status'], { name: 'idx_performance_cycles_tenant_status' });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('performance_cycles');
}
