export async function up(queryInterface, Sequelize) { await queryInterface.addColumn('users', 'avatar_url', { type: Sequelize.DataTypes.STRING(1000), allowNull: true }); }
export async function down(queryInterface) { await queryInterface.removeColumn('users', 'avatar_url'); }
