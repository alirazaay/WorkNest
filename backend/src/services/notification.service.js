import { Notification } from '../database/models/index.js';

export async function createNotification({ tenantId, userId, type, title, message, entityType, entityId, transaction }) {
  return Notification.create({ tenantId, userId, type, title, message, entityType, entityId }, { transaction });
}
