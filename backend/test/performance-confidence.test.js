import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyEvidenceConfidence } from '../src/modules/performance/score.service.js';

test('evidence confidence is classified without changing the score', () => {
  assert.equal(classifyEvidenceConfidence(96), 'high');
  assert.equal(classifyEvidenceConfidence(65), 'moderate');
  assert.equal(classifyEvidenceConfidence(25), 'low');
});
