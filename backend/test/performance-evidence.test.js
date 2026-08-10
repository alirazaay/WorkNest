import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceEvidenceCreateSchema, performanceEvidenceQuerySchema, performanceEvidenceVerifySchema } from '../src/modules/performance/performance.schemas.js';

test('evidence validation supports goal and criterion references', () => {
  const result = performanceEvidenceCreateSchema.safeParse({ cycleId: 1, employeeId: 2, goalId: 3, criterionId: 4, evidenceType: 'kpi_result', title: 'Recruitment report', metricValue: '31%', eventDate: '2026-08-10' });
  assert.equal(result.success, true);
  assert.equal(performanceEvidenceCreateSchema.safeParse({ cycleId: 1, employeeId: 2, evidenceType: 'unknown', title: 'Evidence', eventDate: '2026-08-10' }).success, false);
});

test('evidence filters and verification status remain constrained', () => {
  assert.deepEqual(performanceEvidenceQuerySchema.parse({ cycleId: '2', verificationStatus: 'pending' }), { cycleId: 2, verificationStatus: 'pending' });
  assert.equal(performanceEvidenceVerifySchema.safeParse({ verificationStatus: 'verified' }).success, true);
  assert.equal(performanceEvidenceVerifySchema.safeParse({ verificationStatus: 'pending' }).success, false);
});
