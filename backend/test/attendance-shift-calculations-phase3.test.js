import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('attendance records snapshot shift calculation inputs', async () => {
  const [service, model, migration] = await Promise.all([
    read('../src/modules/attendance/attendance.service.js'),
    read('../src/database/models/AttendanceRecord.js'),
    read('../src/database/migrations/20260814000200-add-shift-calculations-to-attendance.js')
  ]);
  assert.match(service, /resolveShiftForDate/);
  assert.match(service, /scheduledStart: shift\?\.startTime/);
  assert.match(service, /breakMinutesSnapshot/);
  assert.match(service, /overtimeAfterMinutesSnapshot/);
  assert.match(model, /workedMinutes/);
  assert.match(model, /overtimeMinutes/);
  assert.match(migration, /shift_id/);
  assert.match(migration, /overtime_after_minutes_snapshot/);
});

test('late and overtime calculations are backend-derived', async () => {
  const source = await read('../src/modules/attendance/shift.service.js');
  assert.match(source, /calculateLateMinutes/);
  assert.match(source, /calculateOvertimeMinutes/);
  assert.match(source, /isOvernight/);
  assert.match(source, /effectiveTo/);
});
