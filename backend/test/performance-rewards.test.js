import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceRewardApproveSchema, performanceRewardCreateSchema } from '../src/modules/performance/performance.schemas.js';

test('reward recommendations validate supported reward types and non-negative values', () => {
  assert.equal(performanceRewardCreateSchema.safeParse({ cycleId: 1, employeeId: 2, rewardType: 'performance_bonus', recommendedValue: '50000', reason: 'Exceptional business impact' }).success, true);
  assert.equal(performanceRewardCreateSchema.safeParse({ cycleId: 1, employeeId: 2, rewardType: 'unknown', recommendedValue: 10, reason: 'Invalid type' }).success, false);
  assert.equal(performanceRewardCreateSchema.safeParse({ cycleId: 1, employeeId: 2, rewardType: 'promotion', recommendedValue: -1, reason: 'Invalid amount' }).success, false);
});

test('reward approval value is optional and remains bounded', () => {
  assert.equal(performanceRewardApproveSchema.safeParse({}).success, true);
  assert.equal(performanceRewardApproveSchema.safeParse({ approvedValue: -1 }).success, false);
});
