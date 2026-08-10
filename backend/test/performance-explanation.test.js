import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPerformanceExplanation } from '../src/modules/performance/explanation.service.js';
import { performanceExplanationQuerySchema } from '../src/modules/performance/performance.schemas.js';

test('explanation separates performance and promotion conclusions', () => {
  const result = buildPerformanceExplanation({ snapshot: { id: 1, finalScore: 94.5, ratingBand: 'Exceptional', calculationDetails: { lines: [{ criterion: 'Quality', category: 'Quality', weightedScore: 18 }] } }, review: { id: 2 }, evidenceCoverage: 92, signature: { id: 3, signatureName: 'Execution Leader' }, equivalenceGroup: { thresholdUsed: 1, members: [{ finalScore: 94.5 }, { finalScore: 94.3 }] }, promotionAssessment: { id: 4, readinessScore: 95, recommendation: 'ready' }, promotionProfile: { targetRole: 'Team Lead' } });
  assert.match(result.performanceConclusion, /Annual performance/);
  assert.match(result.promotionConclusion, /separate readiness assessment/);
  assert.equal(result.performanceSignature, 'Execution Leader');
});

test('explanation query requires a cycle', () => {
  assert.equal(performanceExplanationQuerySchema.parse({ cycleId: '4' }).cycleId, 4);
  assert.equal(performanceExplanationQuerySchema.safeParse({}).success, false);
});
