import { QueryTypes } from 'sequelize';
import { sequelize } from '../src/config/database.js';

const expectedTables = ['tenants', 'tenant_settings', 'users', 'user_sessions', 'invitations', 'password_reset_tokens', 'departments', 'employees', 'employee_salary_structures', 'employee_documents', 'attendance_records', 'leave_types', 'leave_balances', 'leave_requests', 'notifications', 'payroll_runs', 'payroll_items', 'payroll_item_lines', 'audit_logs'];
const expectedIndexes = { tenants: ['slug'], employees: ['uq_employees_tenant_code', 'idx_employees_tenant_department_status'], attendance_records: ['uq_attendance_employee_date', 'idx_attendance_tenant_date'], leave_balances: ['uq_leave_balances_employee_type_year'], leave_requests: ['idx_leave_requests_status_date'], payroll_runs: ['uq_payroll_runs_tenant_period'], payroll_items: ['uq_payroll_items_run_employee'], audit_logs: ['idx_audit_tenant_created'] };
const expectedForeignKeys = [['users', 'tenant_id', 'tenants'], ['employees', 'tenant_id', 'tenants'], ['employees', 'user_id', 'users'], ['employees', 'department_id', 'departments'], ['attendance_records', 'employee_id', 'employees'], ['leave_requests', 'employee_id', 'employees'], ['leave_requests', 'leave_type_id', 'leave_types'], ['payroll_items', 'payroll_run_id', 'payroll_runs'], ['audit_logs', 'actor_user_id', 'users']];

function fail(message) { throw new Error(message); }
async function main() {
  await sequelize.authenticate();
  const tables = (await sequelize.query("SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = DATABASE()", { type: QueryTypes.SELECT })).map((row) => row.name);
  const missingTables = expectedTables.filter((table) => !tables.includes(table)); if (missingTables.length) fail(`Missing tables: ${missingTables.join(', ')}`);
  const missingIndexes = []; for (const [table, indexes] of Object.entries(expectedIndexes)) { const rows = await sequelize.query(`SHOW INDEX FROM \`${table}\``, { type: QueryTypes.SELECT }); const names = new Set(rows.map((row) => row.Key_name)); for (const index of indexes) if (!names.has(index)) missingIndexes.push(`${table}.${index}`); } if (missingIndexes.length) fail(`Missing indexes: ${missingIndexes.join(', ')}`);
  const foreignKeys = await sequelize.query("SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, REFERENCED_TABLE_NAME AS referencedTable FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL", { type: QueryTypes.SELECT }); const missingForeignKeys = expectedForeignKeys.filter(([table, column, referenced]) => !foreignKeys.some((key) => key.tableName === table && key.columnName === column && key.referencedTable === referenced)); if (missingForeignKeys.length) fail(`Missing foreign keys: ${missingForeignKeys.map((key) => key.join('.')).join(', ')}`);
  console.log(JSON.stringify({ ok: true, tables: expectedTables.length, indexesChecked: Object.values(expectedIndexes).flat().length, foreignKeysChecked: expectedForeignKeys.length }, null, 2));
}
try { await main(); } finally { await sequelize.close(); }
