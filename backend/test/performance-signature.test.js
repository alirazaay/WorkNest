import test from 'node:test';
import assert from 'node:assert/strict';
import { selectPerformanceSignature } from '../src/modules/performance/signature.service.js';
import { performanceSignatureRuleCreateSchema } from '../src/modules/performance/performance.schemas.js';

test('signature selection is deterministic and based on strongest criterion categories', () => {
  const result = selectPerformanceSignature([{ criterionId: 1, criterion: 'Delivery', category: 'Execution', weightedScore: 28 }, { criterionId: 2, criterion: 'Quality', category: 'Quality', weightedScore: 18 }, { criterionId: 3, criterion: 'Innovation', category: 'Innovation', weightedScore: 8 }], [{ id: 1, name: 'Execution Leader', categories: ['Execution'], sortOrder: 1 }, { id: 2, name: 'Innovation Contributor', categories: ['Innovation'], sortOrder: 2 }]);
  assert.equal(result.signatureName, 'Execution Leader');
  assert.equal(result.strongestFactors[0].factor, 'Delivery');
});

test('signature rules require at least one category', () => {
  assert.equal(performanceSignatureRuleCreateSchema.safeParse({ name: 'Execution Leader', categories: ['Execution'] }).success, true);
  assert.equal(performanceSignatureRuleCreateSchema.safeParse({ name: 'Empty Rule', categories: [] }).success, false);
});
