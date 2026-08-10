import test from 'node:test';
import assert from 'node:assert/strict';
import { assertEmployeeRelease, releasedCycleStatuses } from '../src/modules/performance/access.js';

test('employee release gate allows only finalized cycle statuses', () => {
  assert.deepEqual(releasedCycleStatuses, ['completed', 'archived']);
  assert.doesNotThrow(() => assertEmployeeRelease({ role: 'employee' }, { status: 'completed' }));
  assert.throws(() => assertEmployeeRelease({ role: 'employee' }, { status: 'review' }), error => error.code === 'PERFORMANCE_RESULT_NOT_RELEASED' && error.statusCode === 403);
});

test('admin and manager access is not release-gated by the employee policy', () => {
  assert.doesNotThrow(() => assertEmployeeRelease({ role: 'admin' }, { status: 'review' }));
  assert.doesNotThrow(() => assertEmployeeRelease({ role: 'manager' }, { status: 'calibration' }));
});
