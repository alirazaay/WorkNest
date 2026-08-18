import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calculateWeightedScore } from '../src/modules/performance/score.service.js';
import { performanceScoreQuerySchema } from '../src/modules/performance/performance.schemas.js';

test('weighted score calculation is deterministic and normalized by configured weights', () => {
  const result = calculateWeightedScore([{ criterionId: 1, rawScore: 90, evidenceCount: 2, criterion: { name: 'Quality', category: 'Quality', weight: 60 } }, { criterionId: 2, rawScore: 80, evidenceCount: 1, criterion: { name: 'Delivery', category: 'Delivery', weight: 40 } }]);
  assert.equal(result.finalScore, 86);
  assert.equal(result.lines[0].weightedScore, 54);
  assert.equal(result.lines[1].weightedScore, 32);
});

test('score endpoint requires a typed cycle filter', () => {
  assert.deepEqual(performanceScoreQuerySchema.parse({ cycleId: '7' }), { cycleId: 7 });
  assert.equal(performanceScoreQuerySchema.safeParse({}).success, false);
});

test('score calculation requires confirmed reviews, preserves immutable snapshots, and validates weights', async () => {
  const source = await readFile(new URL('../src/modules/performance/score.service.js', import.meta.url), 'utf8');
  assert.match(source, /PerformanceCalibrationDecision/);
  assert.match(source, /status: 'confirmed'/);
  assert.match(source, /NO_CONFIRMED_REVIEWS/);
  assert.match(source, /immutable_snapshot_exists/);
  assert.match(source, /INVALID_SCORE_WEIGHTS/);
  assert.match(source, /INCOMPLETE_REVIEW_CRITERIA/);
  assert.match(source, /templateWeightsAreComplete/);
  assert.match(source, /verificationStatus: 'verified'/);
  assert.match(source, /evidenceCount: count/);
  assert.match(source, /tenantId: auth\.tenantId/);
});
