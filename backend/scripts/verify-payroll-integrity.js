import 'dotenv/config';
import mysql from 'mysql2/promise';

const requiredTables = [
  'payroll_runs', 'payroll_items', 'payroll_item_lines', 'bonuses',
  'employee_deductions', 'employee_loans', 'loan_installments',
  'employee_bank_accounts', 'payroll_adjustments'
];

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectTimeout: 5000
});

try {
  const [tables] = await connection.query(
    `SELECT TABLE_NAME AS name FROM information_schema.tables
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)`,
    [requiredTables]
  );
  const found = new Set(tables.map((row) => row.name));
  const missingTables = requiredTables.filter((name) => !found.has(name));

  const [tenantColumns] = await connection.query(
    `SELECT TABLE_NAME AS name FROM information_schema.columns
     WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'tenant_id'
     AND TABLE_NAME IN (?)`,
    [requiredTables]
  );
  const tenantScoped = new Set(tenantColumns.map((row) => row.name));
  const missingTenantId = requiredTables.filter((name) => !tenantScoped.has(name));

  const [indexes] = await connection.query(
    `SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName, NON_UNIQUE AS nonUnique
     FROM information_schema.statistics
     WHERE TABLE_SCHEMA = DATABASE()
       AND ((TABLE_NAME = 'payroll_runs' AND INDEX_NAME = 'uq_payroll_runs_tenant_period')
         OR (TABLE_NAME = 'payroll_items' AND INDEX_NAME = 'uq_payroll_items_run_employee'))`
  );
  const uniqueIndexes = indexes.filter((row) => Number(row.nonUnique) === 0).map((row) => `${row.tableName}.${row.indexName}`);
  const missingIndexes = ['payroll_runs.uq_payroll_runs_tenant_period', 'payroll_items.uq_payroll_items_run_employee']
    .filter((index) => !uniqueIndexes.includes(index));

  const [duplicatePeriods] = await connection.query(
    `SELECT tenant_id, month, year, COUNT(*) AS count
     FROM payroll_runs GROUP BY tenant_id, month, year HAVING COUNT(*) > 1`
  );
  const [duplicateItems] = await connection.query(
    `SELECT tenant_id, payroll_run_id, employee_id, COUNT(*) AS count
     FROM payroll_items GROUP BY tenant_id, payroll_run_id, employee_id HAVING COUNT(*) > 1`
  );
  const [runMismatches] = await connection.query(
    `SELECT r.id FROM payroll_runs r
     JOIN (SELECT payroll_run_id, SUM(gross_salary) AS gross, SUM(total_deductions) AS deductions, SUM(net_salary) AS net
           FROM payroll_items GROUP BY payroll_run_id) i ON i.payroll_run_id = r.id
     WHERE r.total_gross <> i.gross OR r.total_deductions <> i.deductions OR r.total_net <> i.net`
  );
  const [invalidStatuses] = await connection.query(
    `SELECT COUNT(*) AS count FROM payroll_runs
     WHERE status NOT IN ('draft', 'processing', 'generated', 'under_review', 'approved', 'locked', 'failed')`
  );

  const result = {
    ok: missingTables.length === 0 && missingTenantId.length === 0 && missingIndexes.length === 0
      && duplicatePeriods.length === 0 && duplicateItems.length === 0 && runMismatches.length === 0
      && Number(invalidStatuses[0].count) === 0,
    requiredTables: requiredTables.length,
    missingTables,
    missingTenantId,
    missingIndexes,
    duplicatePeriods,
    duplicateItems,
    runMismatches: runMismatches.map((row) => row.id),
    invalidRunStatusCount: Number(invalidStatuses[0].count)
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
} finally {
  await connection.end();
}
