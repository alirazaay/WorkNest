import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWeightedScore } from '../src/modules/performance/score.service.js';
import { CRITERIA } from '../scripts/test-data/constants.js';
import { edgeCriterionScores, edgeRows } from '../scripts/test-data/fairrank-fixtures.js';
import { mapCriterionScores, peerToScore, trainingToScore, validateRow } from '../scripts/test-data/mappings.js';

test('Kaggle mappings normalize source scales without using reference performance score', () => {
  const row = { 'Task Completion (%)': '80', 'KPI Score': '90', 'Attendance (%)': '95', 'Peer Rating': '4', 'Training Hours': '15', 'Manager Feedback': '3.5', 'Performance Score': '100' };
  const mapped = mapCriterionScores(row);
  assert.equal(mapped['Goal Achievement'], 80);
  assert.equal(mapped.Collaboration, peerToScore(4));
  assert.equal(mapped['Learning & Growth'], trainingToScore(15));
  assert.equal(mapped['Manager Assessment'], 70);
  assert.notEqual(mapped['KPI Achievement'], Number(row['Performance Score']));
});

test('invalid source rows are rejected with row-level reasons', () => {
  const invalid = validateRow({ 'Employee ID': '', Name: '', Department: '', 'KPI Score': '101', 'Attendance (%)': '90', 'Task Completion (%)': '90', 'Peer Rating': '8', 'Training Hours': '-1' }, 4);
  assert.deepEqual(invalid.index, 6);
  assert.ok(invalid.errors.length >= 4);
});

test('edge fixtures are calculated by the real weighted-score function', () => {
  const scores = edgeRows().map(row => calculateWeightedScore(CRITERIA.map(criterion => ({ criterionId: criterion.name, rawScore: edgeCriterionScores(row.__edge)[criterion.name], criterion }))));
  scores.forEach((score, index) => assert.ok(Math.abs(score.finalScore - [94.7, 94.5, 94.3, 91][index]) <= 0.01));
});
