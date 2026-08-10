import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceCalibrationRevealQuerySchema, performanceCalibrationSettingsSchema } from '../src/modules/performance/performance.schemas.js';

test('blind calibration settings and reveal query are typed', () => {
  assert.equal(performanceCalibrationSettingsSchema.safeParse({ blindReviewEnabled: true }).success, true);
  assert.equal(performanceCalibrationSettingsSchema.safeParse({ blindReviewEnabled: 'true' }).success, false);
  assert.equal(performanceCalibrationRevealQuerySchema.parse({ revealIdentity: 'true' }).revealIdentity, true);
});
