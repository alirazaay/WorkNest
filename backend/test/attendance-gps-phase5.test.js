import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('GPS attendance validates tenant locations and persists location metadata', async () => {
  const [locationService, attendanceService, schema, migration] = await Promise.all([
    read('../src/modules/attendance/location.service.js'),
    read('../src/modules/attendance/attendance.service.js'),
    read('../src/modules/attendance/location.schemas.js'),
    read('../src/database/migrations/20260814000500-add-gps-metadata-to-attendance.js')
  ]);
  assert.match(locationService, /tenantId: auth\.tenantId/);
  assert.match(locationService, /OUTSIDE_ATTENDANCE_RADIUS/);
  assert.match(locationService, /GPS_ACCURACY_INSUFFICIENT/);
  assert.match(attendanceService, /source: options\.source/);
  assert.match(attendanceService, /locationId: gps\?\.location\.id/);
  assert.match(schema, /locationId/);
  assert.match(migration, /location_id/);
  assert.match(migration, /device_metadata/);
});

test('GPS location writes are admin-only and audited', async () => {
  const routes = await read('../src/modules/attendance/location.routes.js');
  const service = await read('../src/modules/attendance/location.service.js');
  assert.match(routes, /router\.post\('\/', authorize\('admin'\)/);
  assert.match(routes, /router\.patch\('\/:id', authorize\('admin'\)/);
  assert.match(service, /attendance_location_created/);
  assert.match(service, /attendance_location_updated/);
});
