export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('audit_logs', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
    actor_user_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
    action: { type: DataTypes.STRING(100), allowNull: false }, entity_type: { type: DataTypes.STRING(50), allowNull: false }, entity_id: { type: DataTypes.STRING(64), allowNull: true },
    before_data: { type: DataTypes.JSON, allowNull: true }, after_data: { type: DataTypes.JSON, allowNull: true }, ip_address: { type: DataTypes.STRING(45), allowNull: true }, request_id: { type: DataTypes.STRING(64), allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('audit_logs', ['tenant_id', 'created_at'], { name: 'idx_audit_tenant_created' });
  await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id'], { name: 'idx_audit_entity' });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('audit_logs');
}
