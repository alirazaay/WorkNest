import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceCalibrationActionSchema, performanceCalibrationOverrideSchema } from '../src/modules/performance/performance.schemas.js';

test('calibration actions are constrained and overrides require justification', () => {
  assert.equal(performanceCalibrationActionSchema.safeParse({ action: 'confirm' }).success, true);
  assert.equal(performanceCalibrationActionSchema.safeParse({ action: 'unknown' }).success, false);
  assert.equal(performanceCalibrationOverrideSchema.safeParse({ newScore: 92, newRatingBand: 'Exceptional', justification: 'Evidence and scope were reviewed by HR.' }).success, true);
  assert.equal(performanceCalibrationOverrideSchema.safeParse({ newRatingBand: 'Exceptional', justification: 'short' }).success, false);
});
