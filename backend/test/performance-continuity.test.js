import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildTimeline, trendFor } from '../src/modules/performance/continuity.service.js';

test('continuity classifies baseline, stable, improvement, and decline', () => {
  assert.equal(trendFor(3, null), 'insufficient_history');
  assert.equal(trendFor(3, 3), 'stable');
  assert.equal(trendFor(4, 3), 'improved');
  assert.equal(trendFor(2, 4), 'declined');
  const timeline = buildTimeline([
    { id: 1, cycleId: 1, year: 2019, sourceRating: 3, normalizedScore: 60 },
    { id: 2, cycleId: 2, year: 2020, sourceRating: 3, normalizedScore: 60 },
    { id: 3, cycleId: 3, year: 2021, sourceRating: 4, normalizedScore: 80 },
    { id: 4, cycleId: 4, year: 2022, sourceRating: 4, normalizedScore: 80 },
    { id: 5, cycleId: 5, year: 2023, sourceRating: 3, normalizedScore: 60 }
  ]);
  assert.deepEqual(timeline.map(row => row.trend), ['insufficient_history', 'stable', 'improved', 'stable', 'declined']);
});

test('missing years are explicit and break adjacent continuity', () => {
  const timeline = buildTimeline([
    { id: 1, cycleId: 1, year: 2019, sourceRating: 3, normalizedScore: 60 },
    { id: 3, cycleId: 3, year: 2021, sourceRating: 4, normalizedScore: 80 }
  ]);
  assert.equal(timeline[1].status, 'no_review_data');
  assert.equal(timeline[2].trend, 'insufficient_history');
  assert.equal(timeline[2].changeFromPreviousYear, null);
});

test('continuity uses finalized snapshots and deduplicates each cycle', async () => {
  const source = await readFile(new URL('../src/modules/performance/continuity.service.js', import.meta.url), 'utf8');
  assert.match(source, /PerformanceScoreSnapshot/);
  assert.match(source, /PerformanceCalibrationDecision/);
  assert.match(source, /confirmedCycleKeys/);
  assert.match(source, /\['completed', 'archived'\]/);
  assert.match(source, /const byCycle = new Map/);
  assert.match(source, /fairrank_snapshot/);
  assert.match(source, /cycleName: row\.cycle\?\.name/);
});

test('FairRank snapshot ratings are deterministically represented on the five-point continuity scale', () => {
  const timeline = buildTimeline([{ id: 10, cycleId: 9, year: 2027, originalRating: 4.735, normalizedScore: 94.7, finalScore: 94.7, source: 'fairrank_snapshot' }]);
  assert.equal(timeline[0].originalRating, 4.735);
  assert.equal(timeline[0].normalizedScore, 94.7);
  assert.equal(timeline[0].finalScore, 94.7);
  assert.equal(timeline[0].source, 'fairrank_snapshot');
});
