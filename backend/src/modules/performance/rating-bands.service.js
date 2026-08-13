import { Op } from 'sequelize';
import { PerformanceRatingBand } from '../../database/models/index.js';
import { sequelize } from '../../config/database.js';
import { AppError } from '../../middleware/error.js';
import { recordAudit } from '../../services/audit.service.js';

function assertRange(input) {
  if (Number(input.minScore) >= Number(input.maxScore)) throw new AppError('Rating band maximum must be greater than minimum', 422, 'INVALID_RATING_BAND_RANGE');
}

async function assertNoOverlap(auth, input, id = null, transaction) {
  const bands = await PerformanceRatingBand.findAll({ where: { tenantId: auth.tenantId, isActive: true, ...(id ? { id: { [Op.ne]: id } } : {}) }, transaction, lock: transaction?.LOCK.UPDATE });
  const overlap = bands.find(band => Number(input.minScore) <= Number(band.maxScore) && Number(band.minScore) <= Number(input.maxScore));
  if (overlap) throw new AppError(`Rating band overlaps with ${overlap.name}`, 409, 'RATING_BAND_OVERLAP');
}

export function selectRatingBand(bands, score) {
  return bands.find(band => Number(score) >= Number(band.minScore) && Number(score) <= Number(band.maxScore)) ?? null;
}

export async function listRatingBands(auth) { return PerformanceRatingBand.findAll({ where: { tenantId: auth.tenantId }, order: [['sort_order', 'ASC'], ['min_score', 'ASC']] }); }

export async function createRatingBand(auth, input) {
  assertRange(input);
  return sequelize.transaction(async (transaction) => {
    await assertNoOverlap(auth, input, null, transaction);
    const band = await PerformanceRatingBand.create({ tenantId: auth.tenantId, ...input }, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_rating_band_created', entityType: 'performance_rating_band', entityId: band.id, afterData: band.toJSON(), transaction });
    return band;
  });
}

export async function updateRatingBand(auth, id, input) {
  return sequelize.transaction(async (transaction) => {
    const band = await PerformanceRatingBand.findOne({ where: { id, tenantId: auth.tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!band) throw new AppError('Performance rating band not found', 404, 'PERFORMANCE_RATING_BAND_NOT_FOUND');
    const next = { ...band.toJSON(), ...input };
    if (next.isActive) { assertRange(next); await assertNoOverlap(auth, next, id, transaction); }
    const before = band.toJSON(); await band.update(input, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'performance_rating_band_updated', entityType: 'performance_rating_band', entityId: id, beforeData: before, afterData: band.toJSON(), transaction });
    return band;
  });
}

export async function findRatingBand(tenantId, score, transaction) {
  const bands = await PerformanceRatingBand.findAll({ where: { tenantId, isActive: true }, order: [['sort_order', 'ASC'], ['min_score', 'ASC']], transaction });
  return selectRatingBand(bands, score);
}
