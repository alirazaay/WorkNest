export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.addColumn('attendance_records', 'location_id', { type: DataTypes.INTEGER, allowNull: true, references: { model: 'attendance_locations', key: 'id' }, onDelete: 'SET NULL' });
  await queryInterface.addColumn('attendance_records', 'latitude', { type: DataTypes.DECIMAL(10, 7), allowNull: true });
  await queryInterface.addColumn('attendance_records', 'longitude', { type: DataTypes.DECIMAL(10, 7), allowNull: true });
  await queryInterface.addColumn('attendance_records', 'location_accuracy', { type: DataTypes.DECIMAL(8, 2), allowNull: true });
  await queryInterface.addColumn('attendance_records', 'device_metadata', { type: DataTypes.JSON, allowNull: true });
  await queryInterface.addIndex('attendance_records', ['tenant_id', 'location_id', 'attendance_date'], { name: 'idx_attendance_location_date' });
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('attendance_records', 'idx_attendance_location_date');
  await queryInterface.removeColumn('attendance_records', 'device_metadata');
  await queryInterface.removeColumn('attendance_records', 'location_accuracy');
  await queryInterface.removeColumn('attendance_records', 'longitude');
  await queryInterface.removeColumn('attendance_records', 'latitude');
  await queryInterface.removeColumn('attendance_records', 'location_id');
}
