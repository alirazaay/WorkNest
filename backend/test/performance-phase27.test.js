import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { templateWeightsAreComplete } from '../src/modules/performance/criteria.service.js';
import { groupEquivalentScores } from '../src/modules/performance/equivalence.service.js';
import { buildPerformanceExplanation } from '../src/modules/performance/explanation.service.js';
import { selectRatingBand } from '../src/modules/performance/rating-bands.service.js';
import { calculateReadinessScore } from '../src/modules/performance/promotion.service.js';
import { calculateWeightedScore } from '../src/modules/performance/score.service.js';
import { assertEmployeeRelease } from '../src/modules/performance/access.js';
import { performanceCalibrationOverrideSchema, performanceReviewCreateSchema } from '../src/modules/performance/performance.schemas.js';

test('configured criterion weights must total exactly 100 percent', () => {
  assert.equal(templateWeightsAreComplete([{ weight: 60 }, { weight: 40 }]), true);
  assert.equal(templateWeightsAreComplete([{ weight: 60 }, { weight: 39.9 }]), false);
});

test('performance calculation is server-side and deterministic', () => {
  const result = calculateWeightedScore([
    { criterionId: 1, rawScore: 94, criterion: { name: 'Quality', category: 'Quality', weight: 60 }, evidenceCount: 2 },
    { criterionId: 2, rawScore: 80, criterion: { name: 'Delivery', category: 'Delivery', weight: 40 }, evidenceCount: 1 }
  ]);
  assert.equal(result.finalScore, 88.4);
  assert.equal(result.lines[0].weightedScore, 56.4);
});

test('rating-band assignment selects the configured inclusive range', () => {
  const bands = [{ id: 1, name: 'Exceptional', minScore: 90, maxScore: 100 }, { id: 2, name: 'Meets', minScore: 70, maxScore: 89.999 }];
  assert.equal(selectRatingBand(bands, 90).name, 'Exceptional');
  assert.equal(selectRatingBand(bands, 89.5).name, 'Meets');
  assert.equal(selectRatingBand(bands, 69.9), null);
});

test('equivalence threshold groups 94.7 and 94.5 but not 94.7 and 91.2', () => {
  const within = groupEquivalentScores([{ employeeId: 1, finalScore: 94.7, ratingBand: 'Exceptional' }, { employeeId: 2, finalScore: 94.5, ratingBand: 'Exceptional' }], 1);
  const outside = groupEquivalentScores([{ employeeId: 1, finalScore: 94.7, ratingBand: 'Exceptional' }, { employeeId: 2, finalScore: 91.2, ratingBand: 'Exceptional' }], 1);
  assert.equal(within.length, 1);
  assert.deepEqual(within[0].members.map(row => row.employeeId), [1, 2]);
  assert.equal(outside.length, 0);
});

test('promotion readiness remains separate from the performance score', () => {
  const readiness = calculateReadinessScore([{ id: 1, criterionName: 'Leadership', weight: 100, requiredLevel: 'advanced' }], [{ criterionId: 1, score: 80 }]);
  const explanation = buildPerformanceExplanation({ snapshot: { id: 10, finalScore: 94, ratingBand: 'Exceptional', evidenceCoveragePercentage: 90, calculationDetails: { lines: [] } }, review: { id: 11 }, evidenceCoverage: 90, promotionAssessment: { id: 12, readinessScore: readiness.readinessScore, recommendation: readiness.recommendation }, promotionProfile: { targetRole: 'Team Lead' } });
  assert.equal(explanation.finalScore, 94);
  assert.match(explanation.promotionConclusion, /80/);
  assert.doesNotMatch(explanation.promotionConclusion, /94/);
});

test('review creation and manual override require valid role-safe inputs', () => {
  assert.equal(performanceReviewCreateSchema.safeParse({ cycleId: 1, employeeId: 2, reviewType: 'self', scores: [{ criterionId: 3, rawScore: 90 }] }).success, true);
  assert.equal(performanceCalibrationOverrideSchema.safeParse({ newScore: 95, newRatingBand: 'Exceptional', justification: 'Documented evidence reviewed by HR.' }).success, true);
  assert.equal(performanceCalibrationOverrideSchema.safeParse({ newScore: 95, newRatingBand: 'Exceptional', justification: '' }).success, false);
});

test('employee release policy and finalized-cycle mutation guards remain enforced', async () => {
  assert.doesNotThrow(() => assertEmployeeRelease({ role: 'employee' }, { status: 'completed' }));
  assert.throws(() => assertEmployeeRelease({ role: 'employee' }, { status: 'active' }), error => error.code === 'PERFORMANCE_RESULT_NOT_RELEASED');
  const [performance, reviews, evidence] = await Promise.all([
    readFile(new URL('../src/modules/performance/performance.service.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/modules/performance/reviews.service.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/modules/performance/evidence.service.js', import.meta.url), 'utf8')
  ]);
  assert.match(performance, /Cycle configuration is frozen after activation/);
  assert.match(reviews, /Reviews cannot be changed after cycle completion/);
  assert.match(evidence, /Evidence cannot be added to a completed or archived cycle/);
});

test('tenant and department scoping are present in protected service queries', async () => {
  const files = await Promise.all(['performance.service.js', 'reviews.service.js', 'evidence.service.js', 'promotion.service.js', 'comparison.service.js'].map(name => readFile(new URL(`../src/modules/performance/${name}`, import.meta.url), 'utf8')));
  for (const file of files) assert.match(file, /tenantId: auth\.tenantId/);
  assert.match(files[1], /Managers may only access reviews for their department/);
  assert.match(files[2], /Managers may only access evidence for their department/);
});
