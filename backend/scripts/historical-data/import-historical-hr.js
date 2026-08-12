import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { Op } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../../src/config/database.js';
import { Department, Employee, EmployeeHistoryEvent, HistoricalPerformanceRecord, PerformanceCycle, Tenant, TenantSetting, User } from '../../src/database/models/index.js';
import { emailFor, employeeCodeFor, departmentName, parseSourceDate, validateEmployeeRow } from './employee-mapping.js';
import { mapAction } from './action-mapping.js';
import { mapPerformance } from './performance-mapping.js';
import { parseCsv } from './continuity-fixtures.js';
import { FALLBACK_SOURCE_DIR, SOURCE, SOURCE_DIR, TEST_PASSWORD, TEST_TENANT } from './constants.js';

const log = (label, value) => console.log(`${label}: ${value}`);
const sourcePath = name => { const preferred = `${SOURCE_DIR}/${name}`; return existsSync(preferred) ? preferred : `${FALLBACK_SOURCE_DIR}/${name}`; };

async function resetTenant(slug) {
  await sequelize.transaction(async transaction => {
    const tenant = await Tenant.findOne({ where: { slug }, transaction }); if (!tenant) return;
    const [tables] = await sequelize.query("SELECT DISTINCT TABLE_NAME AS tableName FROM information_schema.columns WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'tenant_id' AND TABLE_NAME <> 'tenants'", { transaction });
    let pending = tables.map(row => row.tableName);
    for (let round = 0; pending.length && round < tables.length + 2; round += 1) {
      const next = []; let progress = false;
      for (const table of pending) { try { const [result] = await sequelize.query(`DELETE FROM \`${table.replace(/`/g, '``')}\` WHERE tenant_id = :tenantId`, { replacements: { tenantId: tenant.id }, transaction }); if (Number(result.affectedRows || 0)) progress = true; } catch (error) { if (error?.original?.code === 'ER_ROW_IS_REFERENCED_2' || error?.parent?.code === 'ER_ROW_IS_REFERENCED_2') next.push(table); else throw error; } }
      if (!progress && next.length === pending.length) throw new Error(`Unable to reset historical tenant; dependent tables: ${next.join(', ')}`); pending = next;
    }
    if (pending.length) throw new Error(`Unable to reset historical tenant tables: ${pending.join(', ')}`);
    await Tenant.destroy({ where: { id: tenant.id }, transaction });
  });
}

async function importData() {
  if (process.env.NODE_ENV === 'production') throw new Error('Continuity-data importer is disabled in production');
  if (process.env.ALLOW_CONTINUITY_DATA_SEED !== 'true') throw new Error('Set ALLOW_CONTINUITY_DATA_SEED=true before running the continuity-data importer');
  await sequelize.authenticate();
  const employeeRows = parseCsv(await readFile(sourcePath('tbl_Employee.csv'), 'utf8')); const actionRows = parseCsv(await readFile(sourcePath('tbl_Action.csv'), 'utf8')); const performanceRows = parseCsv(await readFile(sourcePath('tbl_Perf.csv'), 'utf8'));
  const rejected = []; const employeeIds = new Set(); const validEmployees = [];
  employeeRows.forEach((row, index) => { const issue = validateEmployeeRow(row, index); const id = String(row.EmpID ?? '').trim(); if (issue) rejected.push({ source: 'employee', ...issue }); else if (employeeIds.has(id)) rejected.push({ source: 'employee', row: index + 2, empId: id, errors: ['duplicate EmpID'] }); else { employeeIds.add(id); validEmployees.push({ ...row, EmpID: id, joiningDate: parseSourceDate(row.EngDt), terminationDate: parseSourceDate(row.TermDt) }); } });
  const actions = actionRows.map((row, index) => mapAction(row, index, employeeIds)); const validActions = actions.filter(row => { if (row.errors) { rejected.push({ source: 'action', ...row }); return false; } return true; });
  const performances = performanceRows.map((row, index) => mapPerformance(row, index, employeeIds)); const validPerformance = performances.filter(row => { if (row.errors) { rejected.push({ source: 'performance', ...row }); return false; } return true; });
  await resetTenant(TEST_TENANT.slug); const tenant = await Tenant.create(TEST_TENANT); const hash = await bcrypt.hash(TEST_PASSWORD, 12); const admin = await User.create({ tenantId: tenant.id, name: 'Historical HR Test Admin', email: 'admin@historical-test.worknest.local', passwordHash: hash, role: 'admin', status: 'active', emailVerifiedAt: new Date() }); await TenantSetting.create({ tenantId: tenant.id });
  const departments = {}; for (const depId of [...new Set(validEmployees.map(row => row.DepID))]) departments[depId] = (await Department.create({ tenantId: tenant.id, name: departmentName(depId) })).id;
  const users = await User.bulkCreate(validEmployees.map(row => ({ tenantId: tenant.id, name: row.EmpName, email: emailFor(row.EmpID), passwordHash: hash, role: 'employee', status: 'active', emailVerifiedAt: new Date() })));
  const employeePayload = validEmployees.map((row, index) => ({ tenantId: tenant.id, userId: users[index].id, departmentId: departments[row.DepID], employeeCode: employeeCodeFor(row.EmpID), joiningDate: row.joiningDate, terminationDate: row.terminationDate, employmentStatus: row.terminationDate ? 'terminated' : 'active', sourceMetadata: { source: SOURCE, externalEmployeeId: row.EmpID, genderId: row.GenderID, raceId: row.RaceID, payRate: row.PayRate || null, level: row.Level, rawManagerId: row.MgrID, dateOfBirth: row.DOB } }));
  const employees = await Employee.bulkCreate(employeePayload); const byExternalId = new Map(employees.map((employee, index) => [validEmployees[index].EmpID, employee]));
  for (let index = 0; index < employees.length; index += 1) { const manager = byExternalId.get(validEmployees[index].MgrID); if (manager && manager.id !== employees[index].id) await employees[index].update({ managerEmployeeId: manager.id }); }
  const years = [...new Set(validPerformance.map(row => row.year))].sort((a, b) => a - b); const cycles = {}; for (const year of years) cycles[year] = await PerformanceCycle.create({ tenantId: tenant.id, name: `${year} Annual Review`, cycleType: 'annual', year, startDate: `${year}-01-01`, endDate: `${year}-12-31`, reviewStart: `${year}-11-01`, reviewEnd: `${year}-12-31`, status: 'archived', createdBy: admin.id });
  await EmployeeHistoryEvent.bulkCreate(validActions.map(row => ({ tenantId: tenant.id, employeeId: byExternalId.get(row.EmpID).id, externalActionId: row.ActID, actionCode: row.ActionID, actionType: null, effectiveDate: row.effectiveDate, metadata: { source: SOURCE, rawActionId: row.ActionID }, source: SOURCE })));
  await HistoricalPerformanceRecord.bulkCreate(validPerformance.map(row => ({ tenantId: tenant.id, employeeId: byExternalId.get(row.EmpID).id, cycleId: cycles[row.year].id, sourcePerformanceId: row.PerfID, performanceDate: row.performanceDate, sourceRating: row.rating, normalizedScore: row.normalizedScore, source: SOURCE, metadata: { source: SOURCE, normalization: 'rating * 20' } })));
  const report = { tenant: { id: tenant.id, slug: tenant.slug, companyName: tenant.companyName }, credentials: { adminEmail: admin.email, adminPassword: TEST_PASSWORD, employeePassword: TEST_PASSWORD }, counts: { sourceEmployees: employeeRows.length, employeesImported: employees.length, employeesTerminated: employees.filter(row => row.employmentStatus === 'terminated').length, departments: Object.keys(departments).length, actionsImported: validActions.length, performanceImported: validPerformance.length, cycles: years.length, rejectedRows: rejected.length }, years, actionCodes: [...new Set(validActions.map(row => row.ActionID))].sort(), unresolvedManagerMappings: validEmployees.filter(row => row.MgrID && !byExternalId.has(row.MgrID)).map(row => row.MgrID), rejected, sourcePaths: { employees: sourcePath('tbl_Employee.csv'), actions: sourcePath('tbl_Action.csv'), performance: sourcePath('tbl_Perf.csv') } }; await writeFile(new URL('../../data/kaggle/last-continuity-import-report.json', import.meta.url), JSON.stringify(report, null, 2));
  log('Historical test tenant created', tenant.slug); log('Employees imported', employees.length); log('Employees terminated', report.counts.employeesTerminated); log('Departments created', report.counts.departments); log('Actions imported', validActions.length); log('Performance records imported', validPerformance.length); log('Performance years', years.join(', ')); log('Rejected rows', rejected.length); log('Test admin', admin.email); log('Test password', TEST_PASSWORD);
}

importData().catch(error => { console.error(`Continuity-data import failed: ${error.message}`); if (process.env.DEBUG_CONTINUITY_DATA_SEED === 'true') console.error(error.stack); process.exitCode = 1; }).finally(() => sequelize.close());
