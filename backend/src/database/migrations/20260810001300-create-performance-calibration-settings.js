export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('performance_calibration_settings', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenant_id: { type: DataTypes.INTEGER, allowNull: false, unique: true, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' }, blind_review_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, updated_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' }, created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
}
export async function down(queryInterface) { await queryInterface.dropTable('performance_calibration_settings'); }
