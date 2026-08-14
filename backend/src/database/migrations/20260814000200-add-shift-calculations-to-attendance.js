export async function up(queryInterface, Sequelize) {
  const { DataTypes } = Sequelize;
  await queryInterface.addColumn('attendance_records', 'shift_id', { type: DataTypes.INTEGER, allowNull: true, references: { model: 'shifts', key: 'id' }, onDelete: 'SET NULL' });
  await queryInterface.addColumn('attendance_records', 'worked_minutes', { type: DataTypes.INTEGER, allowNull: true });
  await queryInterface.addColumn('attendance_records', 'overtime_minutes', { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 });
  await queryInterface.addColumn('attendance_records', 'scheduled_start', { type: DataTypes.TIME, allowNull: true });
  await queryInterface.addColumn('attendance_records', 'scheduled_end', { type: DataTypes.TIME, allowNull: true });
  await queryInterface.addColumn('attendance_records', 'break_minutes_snapshot', { type: DataTypes.INTEGER, allowNull: true });
  await queryInterface.addColumn('attendance_records', 'grace_minutes_snapshot', { type: DataTypes.INTEGER, allowNull: true });
  await queryInterface.addColumn('attendance_records', 'overtime_after_minutes_snapshot', { type: DataTypes.INTEGER, allowNull: true });
  await queryInterface.addIndex('attendance_records', ['tenant_id', 'shift_id', 'attendance_date'], { name: 'idx_attendance_shift_date' });
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('attendance_records', 'idx_attendance_shift_date');
  await queryInterface.removeColumn('attendance_records', 'grace_minutes_snapshot');
  await queryInterface.removeColumn('attendance_records', 'overtime_after_minutes_snapshot');
  await queryInterface.removeColumn('attendance_records', 'break_minutes_snapshot');
  await queryInterface.removeColumn('attendance_records', 'scheduled_end');
  await queryInterface.removeColumn('attendance_records', 'scheduled_start');
  await queryInterface.removeColumn('attendance_records', 'overtime_minutes');
  await queryInterface.removeColumn('attendance_records', 'worked_minutes');
  await queryInterface.removeColumn('attendance_records', 'shift_id');
}
