import { sequelize } from '../../config/database.js';
import { AttendanceLocation } from '../../database/models/index.js';
import { recordAudit } from '../../services/audit.service.js';
import { AppError } from '../../middleware/error.js';

function distanceMeters(latitudeA, longitudeA, latitudeB, longitudeB) {
  const earthRadius = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const latDelta = toRadians(latitudeB - latitudeA);
  const lonDelta = toRadians(longitudeB - longitudeA);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB)) * Math.sin(lonDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function assertGpsLocation(auth, input) {
  const location = await AttendanceLocation.findOne({ where: { id: input.locationId, tenantId: auth.tenantId, isActive: true } });
  if (!location) throw new AppError('Attendance location is not active or does not exist', 422, 'ATTENDANCE_LOCATION_NOT_FOUND');
  if (Number(input.accuracy) > Math.min(200, Number(location.radiusMeters))) throw new AppError('GPS accuracy is too low for this attendance location', 422, 'GPS_ACCURACY_INSUFFICIENT');
  const distance = distanceMeters(Number(location.latitude), Number(location.longitude), Number(input.latitude), Number(input.longitude));
  if (distance > Number(location.radiusMeters) + Number(input.accuracy)) throw new AppError('You are outside the allowed attendance location', 422, 'OUTSIDE_ATTENDANCE_RADIUS');
  return { location, distanceMeters: Math.round(distance) };
}

export async function listLocations(auth) {
  return AttendanceLocation.findAll({ where: { tenantId: auth.tenantId, ...(auth.role === 'employee' ? { isActive: true } : {}) }, order: [['isActive', 'DESC'], ['name', 'ASC']] });
}

export async function createLocation(auth, input) {
  return sequelize.transaction(async (transaction) => {
    try {
      const location = await AttendanceLocation.create({ tenantId: auth.tenantId, createdBy: auth.userId, ...input }, { transaction });
      await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'attendance_location_created', entityType: 'attendance_location', entityId: location.id, afterData: location.toJSON(), transaction });
      return location;
    } catch (error) { if (error.name === 'SequelizeUniqueConstraintError') throw new AppError('An attendance location with this name already exists', 409, 'DUPLICATE_ATTENDANCE_LOCATION'); throw error; }
  });
}

export async function updateLocation(auth, id, input) {
  return sequelize.transaction(async (transaction) => {
    const location = await AttendanceLocation.findOne({ where: { id, tenantId: auth.tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!location) throw new AppError('Attendance location not found', 404, 'ATTENDANCE_LOCATION_NOT_FOUND');
    const before = location.toJSON(); await location.update(input, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'attendance_location_updated', entityType: 'attendance_location', entityId: id, beforeData: before, afterData: location.toJSON(), transaction });
    return location;
  });
}

export async function deleteLocation(auth, id) {
  return updateLocation(auth, id, { isActive: false });
}
