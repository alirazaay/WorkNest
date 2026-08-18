import { Op, literal } from 'sequelize';
import { AuditLog, User } from '../../database/models/index.js';

export async function listPerformanceAuditLogs(auth, query = {}) {
  const limit = Math.min(100, Math.max(1, Number(query.limit || 50)));
  const where = {
    tenantId: auth.tenantId,
    ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
    ...(query.action ? { action: { [Op.like]: `%${query.action}%` } } : {}),
    ...(query.fromDate || query.toDate ? { createdAt: { ...(query.fromDate ? { [Op.gte]: `${query.fromDate} 00:00:00` } : {}), ...(query.toDate ? { [Op.lte]: `${query.toDate} 23:59:59` } : {}) } } : {}),
    [Op.and]: [
      query.cycleId ? literal(`(JSON_EXTRACT(after_data, '$.cycleId') = ${Number(query.cycleId)} OR entity_id = '${String(query.cycleId).replaceAll("'", "''")}')`) : null,
      query.employeeId ? literal(`JSON_EXTRACT(after_data, '$.employeeId') = ${Number(query.employeeId)}`) : null,
    ].filter(Boolean),
  };
  const rows = await AuditLog.findAll({
    where: {
      ...where,
      [Op.or]: [
        { action: { [Op.like]: 'performance_%' } },
        { action: { [Op.like]: 'promotion_%' } }
      ]
    },
    include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email'] }],
    attributes: ['id', 'action', 'entityType', 'entityId', 'ipAddress', 'requestId', 'createdAt'],
    order: [['created_at', 'DESC']],
    limit
  });
  return rows.map(row => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    actor: row.actor ? { id: row.actor.id, name: row.actor.name, email: row.actor.email } : null,
    ipAddress: row.ipAddress,
    requestId: row.requestId,
    createdAt: row.createdAt
  }));
}
