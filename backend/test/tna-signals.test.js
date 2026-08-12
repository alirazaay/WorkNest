import test from 'node:test';
import assert from 'node:assert/strict';
import { signalsFromTimeline } from '../src/modules/performance/tna.service.js';

test('TNA detects sustained low performance and significant decline', () => {
  const signals = signalsFromTimeline([
    { year: 2020, cycleId: 1, status: 'reviewed', originalRating: 2, trend: 'insufficient_history', changeFromPreviousYear: null },
    { year: 2021, cycleId: 2, status: 'reviewed', originalRating: 2, trend: 'stable', changeFromPreviousYear: 0 },
    { year: 2022, cycleId: 3, status: 'reviewed', originalRating: 4, trend: 'improved', changeFromPreviousYear: 2 },
    { year: 2023, cycleId: 4, status: 'reviewed', originalRating: 2, trend: 'declined', changeFromPreviousYear: -2 }
  ]);
  assert.ok(signals.some(signal => signal.code === 'SUSTAINED_LOW_PERFORMANCE'));
  assert.ok(signals.some(signal => signal.code === 'SIGNIFICANT_PERFORMANCE_DECLINE'));
});

test('TNA reports missing reviews without inventing a rating', () => {
  const signals = signalsFromTimeline([
    { year: 2020, cycleId: 1, status: 'reviewed', originalRating: 3, trend: 'insufficient_history', changeFromPreviousYear: null },
    { year: 2021, status: 'no_review_data', trend: 'insufficient_history', originalRating: null },
    { year: 2022, cycleId: 3, status: 'reviewed', originalRating: 3, trend: 'insufficient_history', changeFromPreviousYear: null }
  ]);
  assert.deepEqual(signals.filter(signal => signal.code === 'MISSING_REVIEW_DATA').map(signal => signal.year), [2021]);
});
