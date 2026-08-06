import { AuditLog } from '../database/models/index.js';

export async function recordAudit({ tenantId = null, actorUserId = null, action, entityType, entityId = null, beforeData = null, afterData = null, req = null, transaction = undefined }) {
  return AuditLog.create({ tenantId, actorUserId, action, entityType, entityId: entityId == null ? null : String(entityId), beforeData, afterData, ipAddress: req?.ip || null, requestId: req?.requestId || null }, { transaction });
}
