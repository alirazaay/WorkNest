export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('leave_types', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    name: { type: DataTypes.STRING(80), allowNull: false }, code: { type: DataTypes.STRING(30), allowNull: false }, is_paid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }, annual_allowance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, requires_approval: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }, is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.createTable('leave_balances', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' }, employee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' }, leave_type_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'leave_types', key: 'id' }, onDelete: 'CASCADE' }, year: { type: DataTypes.SMALLINT, allowNull: false }, allocated_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, used_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, pending_days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.createTable('leave_requests', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' }, employee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' }, leave_type_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'leave_types', key: 'id' }, onDelete: 'RESTRICT' }, from_date: { type: DataTypes.DATEONLY, allowNull: false }, to_date: { type: DataTypes.DATEONLY, allowNull: false }, total_days: { type: DataTypes.INTEGER, allowNull: false }, reason: { type: DataTypes.TEXT }, status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' }, reviewed_by: { type: DataTypes.INTEGER, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' }, reviewer_comment: { type: DataTypes.TEXT }, reviewed_at: { type: DataTypes.DATE }, applied_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.createTable('notifications', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' }, user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' }, type: { type: DataTypes.STRING(50), allowNull: false }, title: { type: DataTypes.STRING(150), allowNull: false }, message: { type: DataTypes.TEXT, allowNull: false }, entity_type: { type: DataTypes.STRING(50) }, entity_id: { type: DataTypes.INTEGER }, is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }, read_at: { type: DataTypes.DATE },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('leave_types', ['tenant_id', 'code'], { unique: true, name: 'uq_leave_types_tenant_code' });
  await queryInterface.addIndex('leave_balances', ['tenant_id', 'employee_id', 'leave_type_id', 'year'], { unique: true, name: 'uq_leave_balances_employee_type_year' });
  await queryInterface.addIndex('leave_requests', ['tenant_id', 'status', 'from_date'], { name: 'idx_leave_requests_status_date' });
  await queryInterface.addIndex('leave_requests', ['tenant_id', 'employee_id', 'status'], { name: 'idx_leave_requests_employee_status' });
  await queryInterface.addIndex('notifications', ['user_id', 'is_read', 'created_at'], { name: 'idx_notifications_user_read_created' });

  const [tenants] = await queryInterface.sequelize.query('SELECT id FROM tenants');
  for (const tenant of tenants) {
    await queryInterface.bulkInsert('leave_types', [
      { tenant_id: tenant.id, name: 'Annual Leave', code: 'annual', is_paid: true, annual_allowance: 20, requires_approval: true, is_active: true, created_at: new Date(), updated_at: new Date() },
      { tenant_id: tenant.id, name: 'Sick Leave', code: 'sick', is_paid: true, annual_allowance: 10, requires_approval: true, is_active: true, created_at: new Date(), updated_at: new Date() },
      { tenant_id: tenant.id, name: 'Casual Leave', code: 'casual', is_paid: true, annual_allowance: 6, requires_approval: true, is_active: true, created_at: new Date(), updated_at: new Date() },
      { tenant_id: tenant.id, name: 'Unpaid Leave', code: 'unpaid', is_paid: false, annual_allowance: 365, requires_approval: true, is_active: true, created_at: new Date(), updated_at: new Date() }
    ]);
  }
}

export async function down(queryInterface) {
  await queryInterface.dropTable('notifications');
  await queryInterface.dropTable('leave_requests');
  await queryInterface.dropTable('leave_balances');
  await queryInterface.dropTable('leave_types');
}
