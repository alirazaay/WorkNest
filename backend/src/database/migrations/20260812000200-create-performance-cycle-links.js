export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('performance_cycle_links', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    previous_cycle_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'performance_cycles', key: 'id' }, onDelete: 'CASCADE' },
    current_cycle_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'performance_cycles', key: 'id' }, onDelete: 'CASCADE' },
    link_type: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'year_over_year' },
    metadata: { type: DataTypes.JSON },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('performance_cycle_links', ['tenant_id', 'previous_cycle_id', 'current_cycle_id'], { unique: true, name: 'uq_performance_cycle_links_pair' });
}

export async function down(queryInterface) { await queryInterface.dropTable('performance_cycle_links'); }
