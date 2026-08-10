import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const performanceFiles = [
  'access.js', 'calibration.service.js', 'comparison.service.js', 'criteria.service.js',
  'equivalence.service.js', 'explanation.service.js', 'fairness.service.js', 'goals.service.js',
  'performance.service.js', 'promotion.service.js', 'rating-bands.service.js', 'reviews.service.js',
  'rewards.service.js', 'score.service.js', 'signature.service.js', 'transparency.service.js'
];

test('authoritative FairRank calculations contain no AI or random scoring dependency', async () => {
  const sources = await Promise.all(performanceFiles.map(name => readFile(new URL(`../src/modules/performance/${name}`, import.meta.url), 'utf8')));
  const combined = sources.join('\n');
  assert.doesNotMatch(combined, /openai|gpt|llm|Math\.random|crypto\.random/i);
  assert.match(combined, /calculateWeightedScore/);
  assert.match(combined, /groupEquivalentScores/);
  assert.match(combined, /calculateReadinessScore/);
});

test('performance explanations are generated from stored appraisal inputs', async () => {
  const explanation = await readFile(new URL('../src/modules/performance/explanation.service.js', import.meta.url), 'utf8');
  assert.match(explanation, /snapshot\.finalScore/);
  assert.match(explanation, /snapshot\.calculationDetails/);
  assert.doesNotMatch(explanation, /fetch\(|axios|createCompletion|generateText/);
});
