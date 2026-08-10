export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.createTable('performance_reviews', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    cycle_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'performance_cycles', key: 'id' }, onDelete: 'RESTRICT' },
    employee_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'RESTRICT' },
    reviewer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' },
    review_type: { type: DataTypes.STRING(20), allowNull: false }, overall_score: DataTypes.DECIMAL(7, 3), rating_band: DataTypes.STRING(100), strengths: DataTypes.TEXT, improvement_areas: DataTypes.TEXT, comments: DataTypes.TEXT,
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' }, submitted_at: DataTypes.DATE,
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('performance_reviews', ['tenant_id', 'cycle_id', 'employee_id'], { name: 'idx_performance_reviews_employee_cycle' });
  await queryInterface.addIndex('performance_reviews', ['tenant_id', 'reviewer_id', 'status'], { name: 'idx_performance_reviews_reviewer_status' });
  await queryInterface.addIndex('performance_reviews', ['tenant_id', 'cycle_id', 'employee_id', 'review_type'], { unique: true, name: 'uq_performance_review_type' });
  await queryInterface.createTable('performance_review_scores', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
    review_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'performance_reviews', key: 'id' }, onDelete: 'CASCADE' },
    criterion_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'performance_criteria', key: 'id' }, onDelete: 'RESTRICT' },
    raw_score: { type: DataTypes.DECIMAL(7, 3), allowNull: false }, weighted_score: DataTypes.DECIMAL(7, 3), reviewer_comment: DataTypes.TEXT,
    evidence_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
  });
  await queryInterface.addIndex('performance_review_scores', ['tenant_id', 'review_id', 'criterion_id'], { unique: true, name: 'uq_performance_review_score_criterion' });
}
export async function down(queryInterface) { await queryInterface.dropTable('performance_review_scores'); await queryInterface.dropTable('performance_reviews'); }
