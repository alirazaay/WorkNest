export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;

  await queryInterface.createTable('tenants', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    company_name: { type: DataTypes.STRING(150), allowNull: false },
    slug: { type: DataTypes.STRING(180), allowNull: false, unique: true },
    industry: { type: DataTypes.STRING(100), allowNull: true },
    plan: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'starter' },
    employee_limit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
    logo_url: { type: DataTypes.TEXT, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  await queryInterface.createTable('tenant_settings', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, unique: true, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    timezone: { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'Asia/Karachi' },
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'PKR' },
    work_start_time: { type: DataTypes.TIME, allowNull: false, defaultValue: '09:00:00' },
    work_end_time: { type: DataTypes.TIME, allowNull: false, defaultValue: '17:00:00' },
    late_threshold: { type: DataTypes.TIME, allowNull: false, defaultValue: '09:15:00' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  await queryInterface.createTable('users', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    name: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'employee' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'active' },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
    email_verified_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  await queryInterface.createTable('user_sessions', {
    id: { type: DataTypes.UUID, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
    tenant_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    refresh_token_hash: { type: DataTypes.STRING(64), allowNull: false },
    user_agent: { type: DataTypes.STRING(500), allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    last_used_at: { type: DataTypes.DATE, allowNull: true },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  await queryInterface.createTable('invitations', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    email: { type: DataTypes.STRING(255), allowNull: false },
    name: { type: DataTypes.STRING(150), allowNull: false },
    role: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'employee' },
    department_id: { type: DataTypes.INTEGER, allowNull: true },
    token_hash: { type: DataTypes.STRING(64), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    accepted_at: { type: DataTypes.DATE, allowNull: true },
    invited_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  await queryInterface.createTable('password_reset_tokens', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
    token_hash: { type: DataTypes.STRING(64), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    used_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });

  await queryInterface.addIndex('user_sessions', ['user_id', 'revoked_at']);
  await queryInterface.addIndex('user_sessions', ['refresh_token_hash'], { unique: true });
  await queryInterface.addIndex('invitations', ['tenant_id', 'email', 'accepted_at']);
  await queryInterface.addIndex('password_reset_tokens', ['user_id', 'used_at']);
}

export async function down(queryInterface) {
  await queryInterface.dropTable('password_reset_tokens');
  await queryInterface.dropTable('invitations');
  await queryInterface.dropTable('user_sessions');
  await queryInterface.dropTable('users');
  await queryInterface.dropTable('tenant_settings');
  await queryInterface.dropTable('tenants');
}
