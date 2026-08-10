import 'dotenv/config';
import mysql from 'mysql2/promise';

const performanceTables = [
  'performance_cycles', 'performance_criteria', 'performance_templates', 'performance_template_criteria',
  'performance_goals', 'performance_evidence', 'performance_reviews', 'performance_review_scores',
  'performance_score_snapshots', 'performance_rating_bands', 'performance_equivalence_settings',
  'performance_equivalence_groups', 'performance_equivalence_members', 'performance_signature_rules',
  'performance_signatures', 'promotion_profiles', 'promotion_readiness_criteria', 'employee_promotion_assessments',
  'performance_rewards', 'performance_calibration_decisions', 'performance_calibration_settings',
  'performance_appraisal_explanations', 'performance_fairness_flags'
];

const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectTimeout: 5000 });
try {
  const placeholders = performanceTables.map(() => '?').join(',');
  const [rows] = await connection.query(`SELECT TABLE_NAME AS tableName FROM information_schema.columns WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders}) AND COLUMN_NAME = 'tenant_id'`, performanceTables);
  const scoped = new Set(rows.map(row => row.tableName));
  const missing = performanceTables.filter(table => !scoped.has(table));
  if (missing.length) { console.error(JSON.stringify({ ok: false, missingTenantId: missing }, null, 2)); process.exitCode = 1; }
  else console.log(JSON.stringify({ ok: true, checkedTables: performanceTables.length, tablesWithTenantId: scoped.size }, null, 2));
} finally { await connection.end(); }
