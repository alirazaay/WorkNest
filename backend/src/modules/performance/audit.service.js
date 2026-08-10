import { Op } from 'sequelize';
import { AuditLog, User } from '../../database/models/index.js';

export async function listPerformanceAuditLogs(auth, query = {}) {
  const limit = Math.min(100, Math.max(1, Number(query.limit || 50)));
  const rows = await AuditLog.findAll({
    where: {
      tenantId: auth.tenantId,
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
