/**
 * Migration: Add missing performance indexes
 *
 * performance_score_snapshots: Add a unique index on (tenant_id, cycle_id, employee_id)
 *   — this is the most-queried tuple across the entire FairRank pipeline (score lookup,
 *     equivalence, explanation, signature generation) and had no covering index.
 *
 * performance_signatures: Add a unique index on (tenant_id, cycle_id, employee_id)
 *   — ensures only one signature per employee per cycle at the DB level and speeds up
 *     per-employee signature lookups.
 *
 * training_needs: Add a composite index on (tenant_id, employee_id, source_type, source_reference_id)
 *   — used by analyzeEmployeeTna idempotency check (findOne by these four columns).
 */
export async function up(queryInterface) {
  // Unique covering index for score snapshots (most frequently queried combination).
  await queryInterface.addIndex('performance_score_snapshots', ['tenant_id', 'cycle_id', 'employee_id'], {
    unique: true,
    name: 'uq_performance_score_snapshots_tenant_cycle_employee',
  });

  // Unique covering index for signatures (also enforces one-signature-per-employee rule at DB level).
  await queryInterface.addIndex('performance_signatures', ['tenant_id', 'cycle_id', 'employee_id'], {
    unique: true,
    name: 'uq_performance_signatures_tenant_cycle_employee',
  });

  // Composite index for TNA idempotency lookups.
  await queryInterface.addIndex('training_needs', ['tenant_id', 'employee_id', 'source_type', 'source_reference_id'], {
    name: 'idx_training_needs_tenant_employee_source',
  });
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('training_needs', 'idx_training_needs_tenant_employee_source');
  await queryInterface.removeIndex('performance_signatures', 'uq_performance_signatures_tenant_cycle_employee');
  await queryInterface.removeIndex('performance_score_snapshots', 'uq_performance_score_snapshots_tenant_cycle_employee');
}
