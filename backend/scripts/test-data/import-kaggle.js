import { readFile, writeFile } from 'node:fs/promises';
import { Op } from 'sequelize';
import { sequelize } from '../../src/config/database.js';
import { Department, Employee, PerformanceCriterion, PerformanceCycle, PerformanceEquivalenceSetting, PerformanceEvidence, PerformanceGoal, PerformanceRatingBand, PerformanceReview, PerformanceReviewScore, PerformanceSignatureRule, PerformanceTemplate, PerformanceTemplateCriterion, PromotionProfile, PromotionReadinessCriterion, Tenant, TenantSetting, User } from '../../src/database/models/index.js';
import { calculateCycleScores } from '../../src/modules/performance/score.service.js';
import { updatePerformanceCycle } from '../../src/modules/performance/performance.service.js';
import { recalculateEquivalence } from '../../src/modules/performance/equivalence.service.js';
import { generateCycleSignatures } from '../../src/modules/performance/signature.service.js';
import { createPromotionAssessment } from '../../src/modules/performance/promotion.service.js';
import { TEST_PASSWORD, TEST_TENANT, SOURCE_FILE, CRITERIA, BANDS } from './constants.js';
import { mapCriterionScores, validateRow } from './mappings.js';
import { emailFor, employeeCodeFor, passwordHash } from './generators.js';
import { edgeCriterionScores, edgeRows, readinessScores } from './fairrank-fixtures.js';

const authFor = (tenantId, userId) => ({ tenantId, userId, role: 'admin' });
const csvRows = text => { const lines = text.trim().split(/\r?\n/); const headers = lines.shift().split(','); return lines.map(line => { const values = line.split(','); return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])); }); };
const log = (label, value) => console.log(`${label}: ${value}`);

async function resetDedicatedTenant(slug) {
  await sequelize.transaction(async transaction => {
    const previous = await Tenant.findOne({ where: { slug }, transaction });
    if (!previous) return;
    const [tableRows] = await sequelize.query(`SELECT DISTINCT c.TABLE_NAME AS tableName
      FROM information_schema.columns c
      WHERE c.TABLE_SCHEMA = DATABASE() AND c.COLUMN_NAME = 'tenant_id' AND c.TABLE_NAME <> 'tenants'`, { transaction });
    let pending = tableRows.map(row => row.tableName);
    for (let round = 0; pending.length && round < tableRows.length + 2; round += 1) {
      const next = []; let progress = false;
      for (const tableName of pending) {
        try {
          const [result] = await sequelize.query(`DELETE FROM \`${tableName.replace(/`/g, '``')}\` WHERE tenant_id = :tenantId`, { replacements: { tenantId: previous.id }, transaction });
          if (Number(result.affectedRows || 0) > 0) progress = true;
        } catch (error) {
          if (error?.original?.code === 'ER_ROW_IS_REFERENCED_2' || error?.parent?.code === 'ER_ROW_IS_REFERENCED_2') next.push(tableName);
          else throw error;
        }
      }
      if (!progress && next.length === pending.length) throw new Error(`Unable to reset dedicated test tenant because dependent rows remain in: ${next.join(', ')}`);
      pending = next;
    }
    if (pending.length) throw new Error(`Unable to reset dedicated test tenant tables: ${pending.join(', ')}`);
    await Tenant.destroy({ where: { id: previous.id }, transaction });
  });
}

async function importData() {
  if (process.env.NODE_ENV === 'production') throw new Error('Test-data importer is disabled in production');
  if (process.env.ALLOW_TEST_DATA_SEED !== 'true') throw new Error('Set ALLOW_TEST_DATA_SEED=true before running the test-data importer');
  const rows = [...csvRows(await readFile(SOURCE_FILE, 'utf8')), ...edgeRows()];
  const rejected = rows.map((row, index) => validateRow(row, index)).filter(Boolean);
  const valid = rows.filter((_, index) => !rejected.some(item => item.index === index + 2));
  const ids = new Set(); const duplicateRows = [];
  const clean = valid.filter(row => { const id = String(row['Employee ID']).trim(); if (ids.has(id)) { duplicateRows.push({ employeeId: id }); return false; } ids.add(id); return true; });
  await sequelize.authenticate();
  await resetDedicatedTenant(TEST_TENANT.slug);
  const tenant = await Tenant.create(TEST_TENANT);
  const admin = await User.create({ tenantId: tenant.id, name: 'WorkNest Test Admin', email: 'admin@test.worknest.local', passwordHash: await passwordHash(), role: 'admin', status: 'active', emailVerifiedAt: new Date() });
  await TenantSetting.create({ tenantId: tenant.id });
  const departments = {}; for (const name of [...new Set(clean.map(row => row.Department.trim()))]) departments[name] = (await Department.create({ tenantId: tenant.id, name })).id;
  const hash = await passwordHash();
  const users = await User.bulkCreate(clean.map(row => ({ tenantId: tenant.id, name: row.Name.trim(), email: emailFor(row['Employee ID']), passwordHash: hash, role: 'employee', status: 'active', emailVerifiedAt: new Date() })));
  const employees = await Employee.bulkCreate(clean.map((row, index) => ({ tenantId: tenant.id, userId: users[index].id, departmentId: departments[row.Department.trim()], employeeCode: employeeCodeFor(row), designation: row['Job Role'].trim(), joiningDate: '2024-01-15', employmentType: 'full-time', employmentStatus: 'active' })));
  const adminAuth = authFor(tenant.id, admin.id);
  const previousCycle = await PerformanceCycle.create({ tenantId: tenant.id, name: '2025 Annual Performance Review', cycleType: 'annual', year: 2025, startDate: '2025-01-01', endDate: '2025-12-31', goalSettingStart: '2025-01-01', goalSettingEnd: '2025-02-28', reviewStart: '2025-11-01', reviewEnd: '2025-12-15', status: 'draft', createdBy: admin.id });
  const currentCycle = await PerformanceCycle.create({ tenantId: tenant.id, name: '2026 Annual Performance Review', cycleType: 'annual', year: 2026, startDate: '2026-01-01', endDate: '2026-12-31', goalSettingStart: '2026-01-01', goalSettingEnd: '2026-02-28', reviewStart: '2026-11-01', reviewEnd: '2026-12-15', status: 'draft', createdBy: admin.id });
  await updatePerformanceCycle(adminAuth, previousCycle.id, { status: 'active' }); await updatePerformanceCycle(adminAuth, previousCycle.id, { status: 'review' });
  await updatePerformanceCycle(adminAuth, currentCycle.id, { status: 'active' }); await updatePerformanceCycle(adminAuth, currentCycle.id, { status: 'review' });
  const criteria = {}; for (const item of CRITERIA) criteria[item.name] = await PerformanceCriterion.create({ tenantId: tenant.id, ...item, ratingScaleMin: 0, ratingScaleMax: 100, evidenceRequired: true, isActive: true });
  const template = await PerformanceTemplate.create({ tenantId: tenant.id, name: 'Kaggle HRMS Test Template', jobRole: 'All roles', description: 'Development-only template mapped from the Kaggle dataset.', ratingScaleMin: 0, ratingScaleMax: 100, status: 'active', createdBy: admin.id });
  await PerformanceTemplateCriterion.bulkCreate(CRITERIA.map((item, index) => ({ tenantId: tenant.id, templateId: template.id, criterionId: criteria[item.name].id, weight: item.weight, ratingScaleMin: 0, ratingScaleMax: 100, evidenceRequired: true, sortOrder: index })));
  await PerformanceRatingBand.bulkCreate(BANDS.map(item => ({ tenantId: tenant.id, ...item, description: `Development band: ${item.name}`, isActive: true })));
  await PerformanceEquivalenceSetting.create({ tenantId: tenant.id, threshold: 1, strictRanking: false, updatedBy: admin.id });
  await PerformanceSignatureRule.bulkCreate([
    { tenantId: tenant.id, name: 'Execution Leader', categories: ['Execution', 'Reliability'], description: 'Strong execution and reliability.', sortOrder: 1, isActive: true },
    { tenantId: tenant.id, name: 'People & Leadership Contributor', categories: ['Leadership', 'Collaboration'], description: 'Strong people contribution.', sortOrder: 2, isActive: true },
    { tenantId: tenant.id, name: 'Innovation Contributor', categories: ['Quality', 'Learning'], description: 'Strong quality and learning contribution.', sortOrder: 3, isActive: true }
  ]);
  const profile = await PromotionProfile.create({ tenantId: tenant.id, name: 'Team Lead', targetRole: 'Team Lead', description: 'Development promotion-readiness profile.', createdBy: admin.id });
  const readinessCriteria = {}; for (const item of [{ name: 'Leadership', weight: 40 }, { name: 'Communication', weight: 20 }, { name: 'Decision Making', weight: 20 }, { name: 'Technical Expertise', weight: 20 }]) readinessCriteria[item.name] = await PromotionReadinessCriterion.create({ tenantId: tenant.id, profileId: profile.id, criterionName: item.name, weight: item.weight, requiredLevel: 'advanced' });
  const goals = []; const evidence = []; const reviews = []; const scores = [];
  for (let index = 0; index < clean.length; index += 1) {
    const row = clean[index]; const employee = employees[index]; const values = mapCriterionScores(row, row.__edge ? edgeCriterionScores(row.__edge) : null);
    for (const cycle of [previousCycle, currentCycle]) goals.push({ tenantId: tenant.id, cycleId: cycle.id, employeeId: employee.id, title: 'Annual Assigned Objectives', description: 'Mapped from Task Completion (%) in the source fixture.', goalType: 'kpi', targetValue: '100', actualValue: String(row['Task Completion (%)']), unit: '%', weight: 100, dueDate: `${cycle.year}-12-31`, status: Number(row['Task Completion (%)']) >= 100 ? 'completed' : 'in_progress', progressPercentage: Number(row['Task Completion (%)']), managerId: employee.id, createdBy: admin.id });
    for (const cycle of [previousCycle, currentCycle]) { const review = { tenantId: tenant.id, cycleId: cycle.id, employeeId: employee.id, reviewerId: admin.id, reviewType: 'manager', strengths: 'Imported development fixture review.', improvementAreas: 'Use source metrics for coaching discussion.', comments: `Source manager feedback: ${row['Manager Feedback']}. Reference Performance Score: ${row['Performance Score']}. Promotion Eligibility reference: ${row['Promotion Eligibility']}.`, status: 'submitted', submittedAt: new Date() }; reviews.push(review); const createdScores = []; for (const item of CRITERIA) createdScores.push({ tenantId: tenant.id, reviewId: null, criterionId: criteria[item.name].id, rawScore: values[item.name], reviewerComment: `Mapped from ${item.name}.`, evidenceCount: 1 }); scores.push({ review, createdScores }); }
    for (const cycle of [previousCycle, currentCycle]) for (const item of CRITERIA) evidence.push({ tenantId: tenant.id, cycleId: cycle.id, employeeId: employee.id, goalId: null, criterionId: criteria[item.name].id, evidenceType: item.name === 'Goal Achievement' ? 'Goal Achievement' : item.name === 'Attendance Reliability' ? 'Attendance Reliability' : item.name === 'Learning & Growth' ? 'Training Completion' : item.name === 'Manager Assessment' ? 'Manager Observation' : 'KPI Result', title: `${item.name} imported fixture`, description: `Development evidence derived from the Kaggle HR dataset. Work Hours Logged: ${row['Work Hours Logged']}.`, metricValue: String(values[item.name]), sourceType: 'kaggle_fixture', submittedBy: admin.id, verifiedBy: admin.id, verificationStatus: 'verified', eventDate: `${cycle.year}-06-15` });
  }
  await PerformanceGoal.bulkCreate(goals);
  const evidenceRows = await PerformanceEvidence.bulkCreate(evidence);
  const reviewRows = await PerformanceReview.bulkCreate(reviews);
  const scoreRows = scores.flatMap((item, index) => item.createdScores.map(score => ({ ...score, reviewId: reviewRows[index].id })));
  await PerformanceReviewScore.bulkCreate(scoreRows);
  for (const cycle of [previousCycle, currentCycle]) {
    await calculateCycleScores(adminAuth, cycle.id);
    await recalculateEquivalence(adminAuth, cycle.id);
    await generateCycleSignatures(adminAuth, cycle.id);
  }
  for (let index = 0; index < clean.length; index += 1) {
    const row = clean[index]; if (!row.__edge) continue;
    const values = readinessScores(row.__edge); await createPromotionAssessment(adminAuth, { cycleId: previousCycle.id, employeeId: employees[index].id, promotionProfileId: profile.id, scores: Object.entries(values).map(([name, score]) => ({ criterionId: readinessCriteria[name].id, score })), comments: `Reference Promotion Eligibility: ${row['Promotion Eligibility']}.` });
  }
  await updatePerformanceCycle(adminAuth, previousCycle.id, { status: 'calibration' }); await updatePerformanceCycle(adminAuth, previousCycle.id, { status: 'completed' });
  const report = { tenant: { id: tenant.id, slug: tenant.slug, companyName: tenant.companyName }, credentials: { adminEmail: admin.email, adminPassword: TEST_PASSWORD, employeePassword: TEST_PASSWORD }, counts: { sourceRows: rows.length, importedRows: clean.length, rejectedRows: rejected.length, duplicateRows: duplicateRows.length, departments: Object.keys(departments).length, employees: employees.length, goals: goals.length, evidence: evidenceRows.length, reviews: reviewRows.length, reviewScores: scoreRows.length }, rejected, duplicateRows, mappings: { performanceScore: 'reference-only in review comments/report; never authoritative', promotionEligibility: 'reference-only in promotion comments/report', peerRating: 'Peer Rating / 5 * 100', trainingHours: 'Training Hours / 30 * 100', managerFeedback: 'numeric 3-5 normalized as a 1-5 score', workHoursLogged: 'supporting evidence context only' }, edgeCases: ['EDGE-A 94.7 target', 'EDGE-B 94.5 target', 'EDGE-C 94.3 target', 'EDGE-D 91.0 target'] };
  await writeFile(new URL('../../data/kaggle/last-import-report.json', import.meta.url), JSON.stringify(report, null, 2));
  log('Test tenant created', tenant.slug); log('Departments', Object.keys(departments).length); log('Employees imported', employees.length); log('Goals created', goals.length); log('Evidence records', evidenceRows.length); log('Reviews submitted', reviewRows.length); log('Scores calculated', employees.length * 2); log('Rejected rows', rejected.length); log('Test admin', admin.email); log('Test password', TEST_PASSWORD);
}

importData().catch(error => { console.error(`Test-data import failed: ${error.message}`); if (error.errors) console.error(error.errors.map(item => ({ message: item.message, path: item.path, value: item.value }))); process.exitCode = 1; }).finally(() => sequelize.close());
