export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.addColumn('performance_score_snapshots', 'evidence_coverage_percentage', { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 0 });
  await queryInterface.addColumn('performance_score_snapshots', 'evidence_confidence', { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'low' });
  await queryInterface.addColumn('performance_appraisal_explanations', 'evidence_confidence', { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'low' });
}
export async function down(queryInterface) { await queryInterface.removeColumn('performance_appraisal_explanations', 'evidence_confidence'); await queryInterface.removeColumn('performance_score_snapshots', 'evidence_confidence'); await queryInterface.removeColumn('performance_score_snapshots', 'evidence_coverage_percentage'); }
