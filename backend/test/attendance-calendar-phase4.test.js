import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('attendance calendar is tenant-scoped and derives required states', async () => {
  const [service, migration, routes] = await Promise.all([
    read('../src/modules/attendance/calendar.service.js'),
    read('../src/database/migrations/20260814000300-create-attendance-holidays.js'),
    read('../src/modules/attendance/calendar.routes.js')
  ]);
  assert.match(service, /tenantId: auth\.tenantId/);
  for (const status of ['holiday', 'leave', 'overtime', 'absent', 'off']) assert.ok(service.includes(`'${status}'`), `calendar should support ${status}`);
  assert.match(service, /employmentStatus/);
  assert.match(migration, /attendance_holidays/);
  assert.match(routes, /calendarQuerySchema/);
  assert.match(routes, /authorize\('admin', 'manager', 'employee'\)/);
});

test('holiday mutations are audited and administrator-only', async () => {
  const [service, routes] = await Promise.all([read('../src/modules/attendance/calendar.service.js'), read('../src/modules/attendance/calendar.routes.js')]);
  assert.match(service, /attendance_holiday_created/);
  assert.match(service, /attendance_holiday_updated/);
  assert.match(service, /attendance_holiday_deleted/);
  assert.match(routes, /router\.post\('\/holidays', authorize\('admin'\)/);
  assert.match(routes, /router\.delete\('\/holidays\/:id', authorize\('admin'\)/);
});
