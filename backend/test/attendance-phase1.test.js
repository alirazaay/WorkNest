import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('attendance clock mutations are transactional and audited', async () => {
  const source = await read('../src/modules/attendance/attendance.service.js');
  assert.equal((source.match(/sequelize\.transaction\(/g) || []).length, 2);
  assert.match(source, /attendance_clocked_in/);
  assert.match(source, /attendance_clocked_out/);
  assert.match(source, /lock: transaction\.LOCK\.UPDATE/);
});

test('attendance frontend uses the backend attendance field names and clock-out route', async () => {
  const source = await read('../../src/pages/app/AttendancePage.jsx');
  assert.match(source, /api\.patch\(`\/attendance\/\$\{todayRecord\.id\}\/clock-out`\)/);
  assert.match(source, /todayRecord\?\.clockIn/);
  assert.match(source, /todayRecord\?\.clockOut/);
  assert.doesNotMatch(source, /todayRecord\?\.checkIn/);
  assert.doesNotMatch(source, /todayRecord\?\.checkOut/);
});

test('attendance summary preserves existing fields and exposes frontend-compatible aliases', async () => {
  const source = await read('../src/modules/attendance/attendance.service.js');
  assert.match(source, /presentDays/);
  assert.match(source, /lateDays/);
  assert.match(source, /presentToday: presentDays/);
  assert.match(source, /onLeaveToday: onLeaveDays/);
});
