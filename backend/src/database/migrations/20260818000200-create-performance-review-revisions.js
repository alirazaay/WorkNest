export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('performance_review_revisions', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    review_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'performance_reviews', key: 'id' }, onDelete: 'RESTRICT' },
    version: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'original' },
    snapshot: { type: DataTypes.JSON, allowNull: false },
    created_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('performance_review_revisions', ['tenant_id', 'review_id', 'version'], { unique: true, name: 'uq_performance_review_revision_version' });
}
export async function down(queryInterface) { await queryInterface.dropTable('performance_review_revisions'); }
