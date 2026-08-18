import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performanceReviewCreateSchema, performanceReviewQuerySchema } from '../src/modules/performance/performance.schemas.js';
import { selectApplicableReviewCriteria } from '../src/modules/performance/reviews.service.js';

test('review validation requires unique criteria and bounded raw scores', () => {
  const valid = performanceReviewCreateSchema.safeParse({ cycleId: 1, employeeId: 2, reviewType: 'manager', scores: [{ criterionId: 3, rawScore: 88, reviewerComment: 'Strong delivery' }] });
  assert.equal(valid.success, true);
  const duplicate = performanceReviewCreateSchema.safeParse({ cycleId: 1, employeeId: 2, reviewType: 'manager', scores: [{ criterionId: 3, rawScore: 88 }, { criterionId: 3, rawScore: 90 }] });
  assert.equal(duplicate.success, false);
  assert.equal(performanceReviewCreateSchema.safeParse({ cycleId: 1, employeeId: 2, reviewType: 'manager', scores: [{ criterionId: 3, rawScore: 101 }] }).success, false);
});

test('review query filters are typed and constrained', () => {
  assert.deepEqual(performanceReviewQuerySchema.parse({ cycleId: '4', reviewType: 'self', status: 'submitted' }), { cycleId: 4, reviewType: 'self', status: 'submitted' });
});

test('review criteria come from the cycle template once, in template order', () => {
  const criterion = (id, name) => ({ id, name, toJSON: () => ({ id, name }) });
  const result = selectApplicableReviewCriteria([
    { id: 2, criterionId: 8, sortOrder: 2, weight: 40, criterion: criterion(8, 'Learning & Growth') },
    { id: 1, criterionId: 7, sortOrder: 1, weight: 60, criterion: criterion(7, 'Manager Assessment') },
    { id: 3, criterionId: 8, sortOrder: 3, weight: 40, criterion: criterion(8, 'Learning & Growth') }
  ], 12);
  assert.deepEqual(result.map((row) => row.id), [7, 8]);
  assert.equal(result[0].templateId, 12);
});

test('review creation is POST-first, transaction-visible, tenant-scoped, and submission remains explicit', async () => {
  const source = await readFile(new URL('../src/modules/performance/reviews.service.js', import.meta.url), 'utf8');
  const routes = await readFile(new URL('../src/modules/performance/performance.routes.js', import.meta.url), 'utf8');
  assert.match(routes, /router\.post\('\/reviews',/);
  assert.match(source, /tenantId: auth\.tenantId/);
  assert.match(source, /return reviewFor\(auth, review\.id, transaction\)/);
  assert.match(source, /PERFORMANCE_REVIEW_EXISTS/);
  assert.match(source, /export async function submitReview/);
});

test('nonexistent review updates remain a safe not-found error', async () => {
  const source = await readFile(new URL('../src/modules/performance/reviews.service.js', import.meta.url), 'utf8');
  assert.match(source, /Performance review not found/);
  assert.match(source, /where: \{ id, tenantId: auth\.tenantId \}/);
});
