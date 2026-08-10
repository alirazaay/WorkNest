import test from 'node:test';
import assert from 'node:assert/strict';
import { performanceGoalCreateSchema, performanceGoalQuerySchema, performanceGoalUpdateSchema } from '../src/modules/performance/performance.schemas.js';

test('goal validation accepts measurable KPI data and rejects invalid progress', () => {
  const result = performanceGoalCreateSchema.safeParse({ cycleId: 1, employeeId: 2, title: 'Reduce incident resolution time', targetValue: '4 hours', unit: 'hours', weight: 25, progressPercentage: 75 });
  assert.equal(result.success, true);
  assert.equal(performanceGoalCreateSchema.safeParse({ cycleId: 1, employeeId: 2, title: 'KPI', progressPercentage: 101 }).success, false);
  assert.equal(performanceGoalUpdateSchema.safeParse({ status: 'completed', progressPercentage: 100 }).success, true);
});

test('goal filters remain typed and optional', () => {
  const result = performanceGoalQuerySchema.parse({ cycleId: '3', status: 'in_progress' });
  assert.deepEqual(result, { cycleId: 3, status: 'in_progress' });
});
