import test from 'node:test';
import assert from 'node:assert/strict';
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
