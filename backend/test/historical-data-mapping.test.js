import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSourceDate, departmentName, employeeCodeFor } from '../scripts/historical-data/employee-mapping.js';
import { normalizeRating, mapPerformance } from '../scripts/historical-data/performance-mapping.js';
import { mapAction } from '../scripts/historical-data/action-mapping.js';

test('historical dates and stable fixture identifiers are deterministic', () => {
  assert.equal(parseSourceDate('29/May/2017'), '2017-05-29');
  assert.equal(parseSourceDate('01/01/2015'), '2015-01-01');
  assert.equal(employeeCodeFor('12'), 'HIST-000012');
  assert.equal(departmentName('8'), 'Department 8');
});

test('historical ratings preserve source scale and normalize by rating times twenty', () => {
  assert.equal(normalizeRating(1), 20);
  assert.equal(normalizeRating(5), 100);
  const result = mapPerformance({ PerfID: '1', EmpID: '10', Rating: '4', PerfDate: '31/Dec/2023' }, 0, new Set(['10']));
  assert.equal(result.rating, 4);
  assert.equal(result.normalizedScore, 80);
  assert.equal(result.year, 2023);
});

test('unknown action and performance employees are rejected without guessing', () => {
  assert.ok(mapAction({ ActID: '1', ActionID: '10', EmpID: '99', EffectiveDt: '01/Jan/2015' }, 0, new Set()).errors.includes('unknown EmpID'));
  assert.ok(mapPerformance({ PerfID: '1', EmpID: '99', Rating: '4', PerfDate: '31/Dec/2023' }, 0, new Set()).errors.includes('unknown EmpID'));
});
