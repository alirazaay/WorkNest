import test from 'node:test';
import assert from 'node:assert/strict';
import { templateWeightTotal, templateWeightsAreComplete } from '../src/modules/performance/criteria.service.js';
import { performanceCriterionCreateSchema, performanceTemplateCreateSchema, templateCriterionSchema } from '../src/modules/performance/performance.schemas.js';

test('template weights are calculated precisely and require 100 percent', () => {
  const rows = [{ weight: 33.333 }, { weight: 33.333 }, { weight: 33.334 }];
  assert.equal(templateWeightTotal(rows), 100);
  assert.equal(templateWeightsAreComplete(rows), true);
  assert.equal(templateWeightsAreComplete([{ weight: 60 }, { weight: 30 }]), false);
});

test('criteria, templates, and assignments validate their configuration', () => {
  assert.equal(performanceCriterionCreateSchema.safeParse({ name: 'Quality', category: 'Quality' }).success, true);
  assert.equal(performanceTemplateCreateSchema.safeParse({ name: 'Engineer Review', jobRole: 'Software Engineer' }).success, true);
  assert.equal(templateCriterionSchema.safeParse({ criterionId: 1, weight: 50 }).success, true);
});
