export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('tenants', 'company_size', { type: Sequelize.DataTypes.STRING(20), allowNull: true });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('tenants', 'company_size');
}
