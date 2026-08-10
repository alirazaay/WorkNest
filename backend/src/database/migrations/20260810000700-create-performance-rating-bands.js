export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('performance_rating_bands', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    name: { type: DataTypes.STRING(100), allowNull: false }, min_score: { type: DataTypes.DECIMAL(7, 3), allowNull: false }, max_score: { type: DataTypes.DECIMAL(7, 3), allowNull: false }, description: DataTypes.TEXT,
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('performance_rating_bands', ['tenant_id', 'is_active', 'sort_order'], { name: 'idx_performance_rating_bands_order' });
  await queryInterface.addIndex('performance_rating_bands', ['tenant_id', 'name'], { unique: true, name: 'uq_performance_rating_band_name' });
}
export async function down(queryInterface) { await queryInterface.dropTable('performance_rating_bands'); }
