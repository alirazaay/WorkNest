import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReadinessScore } from '../src/modules/performance/promotion.service.js';
import { promotionAssessmentCreateSchema, promotionProfileCreateSchema } from '../src/modules/performance/performance.schemas.js';

test('promotion readiness is calculated independently from performance score', () => {
  const result = calculateReadinessScore([{ id: 1, criterionName: 'Leadership', weight: 60, requiredLevel: 'advanced' }, { id: 2, criterionName: 'Communication', weight: 40, requiredLevel: 'advanced' }], [{ criterionId: 1, score: 95 }, { criterionId: 2, score: 80 }]);
  assert.equal(result.readinessScore, 89);
  assert.equal(result.recommendation, 'ready');
});

test('promotion profiles and assessments validate their structures', () => {
  assert.equal(promotionProfileCreateSchema.safeParse({ name: 'Team Lead', targetRole: 'Team Lead', criteria: [{ criterionName: 'Leadership', weight: 60 }, { criterionName: 'Communication', weight: 40 }] }).success, true);
  assert.equal(promotionAssessmentCreateSchema.safeParse({ cycleId: 1, employeeId: 2, promotionProfileId: 3, scores: [{ criterionId: 4, score: 90 }] }).success, true);
  assert.equal(promotionAssessmentCreateSchema.safeParse({ cycleId: 1, employeeId: 2, promotionProfileId: 3, scores: [{ criterionId: 4, score: 101 }] }).success, false);
});
