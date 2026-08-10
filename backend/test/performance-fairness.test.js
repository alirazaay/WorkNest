import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFairnessFlags } from '../src/modules/performance/fairness.service.js';
import { performanceFairnessResolveSchema } from '../src/modules/performance/performance.schemas.js';

test('fairness flags detect exceptional ratings with weak evidence', () => {
  const flags = buildFairnessFlags({ snapshots: [{ id: 1, cycleId: 1, employeeId: 2, finalScore: 94, ratingBand: 'Exceptional', evidenceCoveragePercentage: 20 }], reviews: [], decisions: [], groups: [], rewards: [] });
  assert.equal(flags[0].flagType, 'exceptional_low_evidence');
});

test('fairness flags detect score differences and reward inconsistency', () => {
  const flags = buildFairnessFlags({ snapshots: [{ id: 1, cycleId: 1, employeeId: 2, finalScore: 90, ratingBand: 'Exceptional', evidenceCoveragePercentage: 90 }], reviews: [{ id: 3, cycleId: 1, employeeId: 2, reviewType: 'manager', overallScore: 70 }], decisions: [], groups: [{ id: 4, members: [{ employeeId: 2 }, { employeeId: 5 }] }], rewards: [{ employeeId: 2, rewardType: 'performance_bonus', recommendedValue: 100 }, { employeeId: 5, rewardType: 'performance_bonus', recommendedValue: 500 }] });
  assert.equal(flags.some(flag => flag.flagType === 'manager_score_difference'), true);
  assert.equal(flags.some(flag => flag.flagType === 'equivalent_reward_difference'), true);
  assert.equal(performanceFairnessResolveSchema.safeParse({ status: 'resolved', resolutionNote: 'Reviewed and documented.' }).success, true);
});
