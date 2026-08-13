import { Op } from 'sequelize';
import { Employee, PerformanceCycle, PerformanceEquivalenceGroup, PerformanceEquivalenceMember, PerformanceEquivalenceSetting, PerformanceScoreSnapshot, User } from '../../database/models/index.js';
import { sequelize } from '../../config/database.js';
import { AppError } from '../../middleware/error.js';
import { recordAudit } from '../../services/audit.service.js';

export function groupEquivalentScores(scores, threshold) {
  const groups = [];
  const byBand = new Map();
  for (const score of [...scores].sort((a, b) => Number(b.finalScore) - Number(a.finalScore))) {
    const key = score.ratingBand || 'unbanded';
    if (!byBand.has(key)) byBand.set(key, []);
    byBand.get(key).push(score);
  }
  for (const [band, rows] of byBand) {
    let current = [];
    for (const row of rows) {
      if (current.length && Number(current[0].finalScore) - Number(row.finalScore) > Number(threshold)) { if (current.length > 1) groups.push({ ratingBand: band === 'unbanded' ? null : band, members: current }); current = []; }
      current.push(row);
    }
    if (current.length > 1) groups.push({ ratingBand: band === 'unbanded' ? null : band, members: current });
  }
  return groups;
}

export async function getEquivalenceSettings(auth) {
  const settings = await PerformanceEquivalenceSetting.findOne({ where: { tenantId: auth.tenantId } });
  return settings ?? { tenantId: auth.tenantId, threshold: 1, strictRanking: false, isDefault: true };
}

export async function updateEquivalenceSettings(auth, input) {
  if (Number(input.threshold) < 0 || Number(input.threshold) > 10) throw new AppError('Equivalence threshold must be between 0 and 10 points', 422, 'INVALID_EQUIVALENCE_THRESHOLD');
  return sequelize.transaction(async (transaction) => {
    const before = await getEquivalenceSettings(auth);
    const [settings] = await PerformanceEquivalenceSetting.findOrCreate({ where: { tenantId: auth.tenantId }, defaults: { tenantId: auth.tenantId, ...input, updatedBy: auth.userId }, transaction });
    await settings.update({ ...input, updatedBy: auth.userId }, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_equivalence_settings_updated', entityType: 'performance_equivalence_setting', entityId: settings.id, beforeData: before, afterData: settings.toJSON(), transaction });
    return settings;
  });
}

const groupInclude = [{ model: PerformanceEquivalenceMember, as: 'members', include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeCode', 'departmentId'], include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] }] }, { model: PerformanceCycle, as: 'cycle', attributes: ['id', 'name', 'year', 'status'] }];

export async function listEquivalenceGroups(auth, cycleId) {
  const where = { tenantId: auth.tenantId, ...(cycleId ? { cycleId } : {}) };
  const groups = await PerformanceEquivalenceGroup.findAll({ where, include: groupInclude, order: [['cycleId', 'DESC'], ['id', 'ASC']] });
  if (auth.role !== 'manager') return groups;
  const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] });
  if (!manager?.departmentId) throw new AppError('Manager is not assigned to a department', 403, 'NO_MANAGER_DEPARTMENT');
  return groups.filter(group => group.members.every(member => member.employee.departmentId === manager.departmentId));
}

export async function recalculateEquivalence(auth, cycleId) {
  const cycle = await PerformanceCycle.findOne({ where: { id: cycleId, tenantId: auth.tenantId } });
  if (!cycle) throw new AppError('Performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
  const settings = await getEquivalenceSettings(auth);
  return sequelize.transaction(async transaction => {
    const snapshots = await PerformanceScoreSnapshot.findAll({ where: { tenantId: auth.tenantId, cycleId }, transaction });
    const groups = groupEquivalentScores(snapshots.map(snapshot => ({ id: snapshot.id, employeeId: snapshot.employeeId, finalScore: snapshot.finalScore, ratingBand: snapshot.ratingBand, ratingBandId: snapshot.calculationDetails?.ratingBandId ?? null })), Number(settings.threshold));
    await PerformanceEquivalenceGroup.destroy({ where: { tenantId: auth.tenantId, cycleId }, transaction });
    const created = [];
    for (const group of groups) {
      const bandId = group.members[0].ratingBandId ?? null;
      const row = await PerformanceEquivalenceGroup.create({ tenantId: auth.tenantId, cycleId, ratingBandId: bandId, ratingBand: group.ratingBand, thresholdUsed: settings.threshold }, { transaction });
      await PerformanceEquivalenceMember.bulkCreate(group.members.map(member => ({ tenantId: auth.tenantId, groupId: row.id, employeeId: member.employeeId, finalScore: member.finalScore })), { transaction });
      created.push(row);
    }
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_equivalence_recalculated', entityType: 'performance_cycle', entityId: cycleId, afterData: { threshold: settings.threshold, groupCount: created.length, snapshotCount: snapshots.length }, transaction });
    return { cycleId, threshold: Number(settings.threshold), snapshotCount: snapshots.length, groupCount: created.length, groups: created };
  });
}
