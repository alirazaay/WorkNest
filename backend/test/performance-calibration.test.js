import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performanceCalibrationActionSchema, performanceCalibrationOverrideSchema } from '../src/modules/performance/performance.schemas.js';

test('calibration actions are constrained and overrides require justification', () => {
  assert.equal(performanceCalibrationActionSchema.safeParse({ action: 'confirm' }).success, true);
  assert.equal(performanceCalibrationActionSchema.safeParse({ action: 'unknown' }).success, false);
  assert.equal(performanceCalibrationOverrideSchema.safeParse({ newScore: 92, newRatingBand: 'Exceptional', justification: 'Evidence and scope were reviewed by HR.' }).success, true);
  assert.equal(performanceCalibrationOverrideSchema.safeParse({ newRatingBand: 'Exceptional', justification: 'short' }).success, false);
});

test('confirmation is persisted as a terminal tenant-scoped calibration decision', async () => {
  const source = await readFile(new URL('../src/modules/performance/calibration.service.js', import.meta.url), 'utf8');
  assert.match(source, /status: input\.action === 'confirm' \? 'confirmed'/);
  assert.match(source, /CALIBRATION_ALREADY_CONFIRMED/);
  assert.match(source, /PerformanceCalibrationDecision\.findOne\(\{ where: \{ tenantId: auth\.tenantId, reviewId: id \}/);
  assert.match(source, /performance_calibration_\$\{values\.status\}/);
  assert.match(source, /sequelize\.transaction\(/);
});
