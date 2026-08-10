import { Op } from 'sequelize';
import { Employee, PerformanceCycle, PerformanceScoreSnapshot, PerformanceSignature, PerformanceSignatureRule, User } from '../../database/models/index.js';
import { sequelize } from '../../config/database.js';
import { AppError } from '../../middleware/error.js';
import { recordAudit } from '../../services/audit.service.js';

const normalize = value => String(value || '').trim().toLowerCase();

export function selectPerformanceSignature(lines, rules) {
  if (!lines?.length || !rules?.length) return null;
  const ranked = rules.map(rule => {
    const categories = (rule.categories || []).map(normalize);
    const matching = lines.filter(line => categories.includes(normalize(line.category)));
    const score = matching.reduce((sum, line) => sum + Number(line.weightedScore || 0), 0);
    return { rule, matching, score };
  }).filter(row => row.matching.length).sort((a, b) => b.score - a.score || Number(a.rule.sortOrder || 0) - Number(b.rule.sortOrder || 0) || String(a.rule.name).localeCompare(String(b.rule.name)));
  if (!ranked.length) return null;
  const chosen = ranked[0];
  const strongestFactors = [...chosen.matching].sort((a, b) => Number(b.weightedScore || 0) - Number(a.weightedScore || 0)).slice(0, 3).map(line => ({ criterionId: line.criterionId, factor: line.criterion || line.category, category: line.category, weightedScore: Number(line.weightedScore || 0) }));
  return { ruleId: chosen.rule.id, signatureName: chosen.rule.name, signatureScore: Math.round(chosen.score * 1000) / 1000, strongestFactors, matchedCategories: chosen.matching.map(line => line.category).filter(Boolean) };
}

export async function listSignatureRules(auth) { return PerformanceSignatureRule.findAll({ where: { tenantId: auth.tenantId }, order: [['sort_order', 'ASC'], ['name', 'ASC']] }); }

export async function createSignatureRule(auth, input) {
  const rule = await PerformanceSignatureRule.create({ tenantId: auth.tenantId, ...input });
  await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_signature_rule_created', entityType: 'performance_signature_rule', entityId: rule.id, afterData: rule.toJSON() });
  return rule;
}

export async function updateSignatureRule(auth, id, input) {
  const rule = await PerformanceSignatureRule.findOne({ where: { id, tenantId: auth.tenantId } });
  if (!rule) throw new AppError('Performance signature rule not found', 404, 'PERFORMANCE_SIGNATURE_RULE_NOT_FOUND');
  const before = rule.toJSON(); await rule.update(input);
  await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_signature_rule_updated', entityType: 'performance_signature_rule', entityId: id, beforeData: before, afterData: rule.toJSON() });
  return rule;
}

async function employeeFor(auth, id) {
  const employee = await Employee.findOne({ where: { id, tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' } } });
  if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  if (auth.role === 'employee' && employee.userId !== auth.userId) throw new AppError('You may only access your own performance signature', 403, 'SIGNATURE_ACCESS_DENIED');
  if (auth.role === 'manager') {
    const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] });
    if (!manager?.departmentId || manager.departmentId !== employee.departmentId) throw new AppError('Managers may only access signatures for their department', 403, 'SIGNATURE_ACCESS_DENIED');
  }
  return employee;
}

export async function getEmployeeSignature(auth, cycleId, employeeId) {
  await employeeFor(auth, employeeId);
  const signature = await PerformanceSignature.findOne({ where: { tenantId: auth.tenantId, cycleId, employeeId }, include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeCode'], include: [{ model: User, as: 'user', attributes: ['id', 'name'] }] }, { model: PerformanceCycle, as: 'cycle', attributes: ['id', 'name', 'year', 'status'] }, { model: PerformanceSignatureRule, as: 'rule', attributes: ['id', 'name', 'categories'] }] });
  if (!signature) throw new AppError('Performance signature has not been generated yet', 404, 'PERFORMANCE_SIGNATURE_NOT_FOUND');
  return signature;
}

export async function generateCycleSignatures(auth, cycleId) {
  const cycle = await PerformanceCycle.findOne({ where: { id: cycleId, tenantId: auth.tenantId } });
  if (!cycle) throw new AppError('Performance cycle not found', 404, 'PERFORMANCE_CYCLE_NOT_FOUND');
  const rules = await PerformanceSignatureRule.findAll({ where: { tenantId: auth.tenantId, isActive: true }, order: [['sort_order', 'ASC'], ['name', 'ASC']] });
  if (!rules.length) throw new AppError('Create at least one active signature rule before generating signatures', 409, 'SIGNATURE_RULES_REQUIRED');
  return sequelize.transaction(async transaction => {
    const snapshots = await PerformanceScoreSnapshot.findAll({ where: { tenantId: auth.tenantId, cycleId }, transaction });
    const created = []; const skipped = []; const unmatched = [];
    for (const snapshot of snapshots) {
      const existing = await PerformanceSignature.findOne({ where: { tenantId: auth.tenantId, cycleId, employeeId: snapshot.employeeId }, transaction, lock: transaction.LOCK.UPDATE });
      if (existing) { skipped.push({ employeeId: snapshot.employeeId, signatureId: existing.id }); continue; }
      const selected = selectPerformanceSignature(snapshot.calculationDetails?.lines || [], rules);
      if (!selected) { unmatched.push(snapshot.employeeId); continue; }
      const signature = await PerformanceSignature.create({ tenantId: auth.tenantId, cycleId, employeeId: snapshot.employeeId, signatureRuleId: selected.ruleId, signatureName: selected.signatureName, strongestFactors: selected.strongestFactors, signatureScore: selected.signatureScore, calculationDetails: { version: 1, sourceSnapshotId: snapshot.id, matchedCategories: selected.matchedCategories, ruleCategories: selected.rule.categories }, generatedBy: auth.userId, generatedAt: new Date() }, { transaction });
      await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_signature_generated', entityType: 'performance_signature', entityId: signature.id, afterData: { cycleId, employeeId: snapshot.employeeId, signatureName: selected.signatureName, sourceSnapshotId: snapshot.id }, transaction });
      created.push(signature);
    }
    return { cycleId, snapshotCount: snapshots.length, created, skipped, unmatched }; 
  });
}
