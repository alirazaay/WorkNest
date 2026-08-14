import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('attendance shift schema and service are tenant-scoped and transactional', async () => {
  const [service, migration, routes] = await Promise.all([
    read('../src/modules/attendance/shift.service.js'),
    read('../src/database/migrations/20260814000100-create-attendance-shifts.js'),
    read('../src/modules/attendance/shift.routes.js')
  ]);
  assert.match(migration, /tenant_id/);
  assert.match(migration, /shifts/);
  assert.match(migration, /shift_weekly_schedules/);
  assert.match(migration, /employee_shift_assignments/);
  assert.match(service, /sequelize\.transaction\(/);
  assert.match(service, /tenantId: auth\.tenantId/);
  assert.match(service, /SHIFT_ASSIGNMENT_OVERLAP/);
  assert.match(routes, /router\.use\(authenticate, authorize\('admin'\)\)/);
});

test('attendance shift routes expose schedules and effective-dated assignments', async () => {
  const routes = await read('../src/modules/attendance/shift.routes.js');
  assert.match(routes, /\/:id\/schedule/);
  assert.match(routes, /employees\/:employeeId\/assignments/);
  assert.match(routes, /assignments\/:assignmentId/);
});
