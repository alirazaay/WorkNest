import test from 'node:test';
import assert from 'node:assert/strict';
import { groupEquivalentScores } from '../src/modules/performance/equivalence.service.js';
import { performanceEquivalenceSettingsSchema } from '../src/modules/performance/performance.schemas.js';

test('scores within the configured threshold are grouped without forced ranking', () => {
  const groups = groupEquivalentScores([{ employeeId: 1, finalScore: 94.7, ratingBand: 'Exceptional' }, { employeeId: 2, finalScore: 94.5, ratingBand: 'Exceptional' }, { employeeId: 3, finalScore: 94.3, ratingBand: 'Exceptional' }], 1);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].members.map(row => row.employeeId), [1, 2, 3]);
});

test('scores outside the configured threshold are not grouped', () => {
  const groups = groupEquivalentScores([{ employeeId: 1, finalScore: 94.7, ratingBand: 'Exceptional' }, { employeeId: 2, finalScore: 91.2, ratingBand: 'Exceptional' }], 1);
  assert.equal(groups.length, 0);
  assert.equal(performanceEquivalenceSettingsSchema.parse({ threshold: '1' }).threshold, 1);
});
