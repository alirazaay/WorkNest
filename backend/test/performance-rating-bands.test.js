import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceRatingBandCreateSchema } from '../src/modules/performance/performance.schemas.js';

test('rating band validation accepts bounded configuration', () => {
  assert.equal(performanceRatingBandCreateSchema.safeParse({ name: 'Exceptional', minScore: 90, maxScore: 100 }).success, true);
  assert.equal(performanceRatingBandCreateSchema.safeParse({ name: 'Invalid', minScore: -1, maxScore: 101 }).success, false);
});

test('rating band ranges require separate minimum and maximum values', () => {
  const validSchemaInput = performanceRatingBandCreateSchema.parse({ name: 'Meets', minScore: 70, maxScore: 80 });
  assert.ok(validSchemaInput.minScore < validSchemaInput.maxScore);
});
