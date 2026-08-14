import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { TenantSetting } from '../../database/models/TenantSetting.js';
import { AttendanceRecord, Department, Employee, User } from '../../database/models/index.js';
import { recordAudit } from '../../services/audit.service.js';
import { calculateLateMinutes, calculateOvertimeMinutes, resolveShiftForDate, shiftDurationMinutes, timeToMinutes as shiftTimeToMinutes } from './shift.service.js';
import { assertGpsLocation } from './location.service.js';
import { AppError } from '../../middleware/error.js';

const employeeInclude = { model: Employee, as: 'employee', attributes: ['id', 'employeeCode', 'departmentId', 'employmentStatus'], include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatarUrl'] }, { model: Department, as: 'department', attributes: ['id', 'name'] }] };

function localParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, minutes: Number(values.hour) * 60 + Number(values.minute) };
}

function monthRange(value) {
  const [year, month] = value.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${value}-01`, to: `${value}-${String(lastDay).padStart(2, '0')}` };
}

async function employeeForUser(auth) {
  const employee = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId, employmentStatus: { [Op.ne]: 'terminated' } } });
  if (!employee) throw new AppError('You do not have an active employee profile', 403, 'EMPLOYEE_PROFILE_REQUIRED');
  return employee;
}

async function managerDepartment(auth) {
  if (auth.role !== 'manager') return null;
  const employee = await employeeForUser(auth);
  if (!employee.departmentId) throw new AppError('Manager is not assigned to a department', 403, 'NO_MANAGER_DEPARTMENT');
  return employee.departmentId;
}

async function findScopedEmployee(auth, employeeId) {
  const managerDepartmentId = await managerDepartment(auth);
  const employee = await Employee.findOne({ where: { id: employeeId, tenantId: auth.tenantId, ...(managerDepartmentId ? { departmentId: managerDepartmentId } : {}) } });
  if (!employee) throw new AppError('Employee not found in your scope', 404, 'EMPLOYEE_NOT_FOUND');
  return employee;
}

export async function clockIn(auth, options = {}) {
  const employee = await employeeForUser(auth);
  const settings = await TenantSetting.findOne({ where: { tenantId: auth.tenantId } });
  const now = new Date(); const local = localParts(now, settings?.timezone || 'Asia/Karachi');
  const gps = options.source === 'gps' ? await assertGpsLocation(auth, options) : null;
  return sequelize.transaction(async (transaction) => {
    const existing = await AttendanceRecord.findOne({ where: { tenantId: auth.tenantId, employeeId: employee.id, attendanceDate: local.date }, transaction, lock: transaction.LOCK.UPDATE });
    if (existing) throw new AppError(existing.clockOut ? 'Attendance has already been completed for today' : 'You are already clocked in', 409, 'ALREADY_CLOCKED_IN');
    const shift = await resolveShiftForDate(auth, employee.id, local.date, transaction);
    const lateMinutes = shift ? calculateLateMinutes(local.minutes, shift) : Math.max(0, local.minutes - shiftTimeToMinutes(settings?.lateThreshold || '09:15:00'));
    try {
      const record = await AttendanceRecord.create({ tenantId: auth.tenantId, employeeId: employee.id, shiftId: shift?.id || null, locationId: gps?.location.id || null, latitude: gps ? options.latitude : null, longitude: gps ? options.longitude : null, locationAccuracy: gps ? options.accuracy : null, deviceMetadata: options.deviceMetadata || null, attendanceDate: local.date, clockIn: now, lateMinutes, scheduledStart: shift?.startTime || null, scheduledEnd: shift?.endTime || null, breakMinutesSnapshot: shift?.breakMinutes ?? null, graceMinutesSnapshot: shift?.graceMinutes ?? null, overtimeAfterMinutesSnapshot: shift?.overtimeAfterMinutes ?? null, status: lateMinutes > 0 ? 'late' : 'present', source: options.source || 'web' }, { transaction });
      await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'attendance_clocked_in', entityType: 'attendance_record', entityId: record.id, afterData: record.toJSON(), transaction });
      return record;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') throw new AppError('You are already clocked in', 409, 'ALREADY_CLOCKED_IN');
      throw error;
    }
  });
}

export async function clockOut(auth, id) {
  const employee = await employeeForUser(auth);
  return sequelize.transaction(async (transaction) => {
    const record = await AttendanceRecord.findOne({ where: { id, tenantId: auth.tenantId, employeeId: employee.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!record) throw new AppError('Attendance record not found', 404, 'ATTENDANCE_NOT_FOUND');
    if (!record.clockIn) throw new AppError('Attendance has no clock-in time', 409, 'INVALID_ATTENDANCE');
    if (record.clockOut) throw new AppError('You are already clocked out', 409, 'ALREADY_CLOCKED_OUT');
    const before = record.toJSON();
    const clockOutTime = new Date(); const totalMinutes = Math.max(0, Math.floor((clockOutTime.getTime() - new Date(record.clockIn).getTime()) / 60_000));
    const workedMinutes = Math.max(0, totalMinutes - Number(record.breakMinutesSnapshot || 0));
    const overtimeMinutes = record.shiftId && record.overtimeAfterMinutesSnapshot != null ? calculateOvertimeMinutes(workedMinutes, { overtimeAfterMinutes: record.overtimeAfterMinutesSnapshot, startTime: record.scheduledStart, endTime: record.scheduledEnd, isOvernight: record.scheduledEnd < record.scheduledStart }) : 0;
    record.clockOut = clockOutTime; record.totalMinutes = totalMinutes; record.workedMinutes = workedMinutes; record.overtimeMinutes = overtimeMinutes; record.status = record.lateMinutes > 0 ? 'late' : 'present'; await record.save({ fields: ['clockOut', 'totalMinutes', 'workedMinutes', 'overtimeMinutes', 'status'], transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'attendance_clocked_out', entityType: 'attendance_record', entityId: record.id, beforeData: before, afterData: record.toJSON(), transaction });
    return record;
  });
}

function attendanceWhere(auth, query, employeeId) {
  const where = { tenantId: auth.tenantId };
  if (employeeId) where.employeeId = employeeId;
  if (query.date) where.attendanceDate = query.date;
  if (query.fromDate || query.toDate) where.attendanceDate = { [Op.between]: [query.fromDate || '1000-01-01', query.toDate || '9999-12-31'] };
  if (query.status) where.status = query.status;
  return where;
}

export async function listAttendance(auth, query, requestedEmployeeId = null) {
  const managerDepartmentId = await managerDepartment(auth);
  const where = attendanceWhere(auth, query, requestedEmployeeId || query.employeeId);
  const employeeWhere = managerDepartmentId ? { departmentId: managerDepartmentId } : undefined;
  const page = Math.max(1, Number(query.page || 1)); const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 25)));
  const result = await AttendanceRecord.findAndCountAll({ where, include: [{ ...employeeInclude, where: employeeWhere, required: Boolean(employeeWhere) }], order: [['attendanceDate', 'DESC'], ['clockIn', 'DESC']], limit: pageSize, offset: (page - 1) * pageSize, distinct: true });
  return { items: result.rows, pagination: { page, pageSize, total: result.count, totalPages: Math.ceil(result.count / pageSize) } };
}

export async function myAttendance(auth, query) {
  const employee = await employeeForUser(auth);
  return listAttendance(auth, query, employee.id);
}

export async function summary(auth, query) {
  const managerDepartmentId = await managerDepartment(auth);
  const employeeId = query.employeeId ? (await findScopedEmployee(auth, query.employeeId)).id : null;
  const range = monthRange(query.month || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit' }).format(new Date()));
  const where = { tenantId: auth.tenantId, attendanceDate: { [Op.between]: [range.from, range.to] }, ...(employeeId ? { employeeId } : {}) };
  const rows = await AttendanceRecord.findAll({ where, include: managerDepartmentId ? [{ model: Employee, as: 'employee', where: { departmentId: managerDepartmentId }, attributes: [] }] : [] });
  const byStatus = (status) => rows.filter((row) => row.status === status).length;
  const completed = rows.filter((row) => ['present', 'late', 'half-day'].includes(row.status)).length;
  const presentDays = byStatus('present');
  const lateDays = byStatus('late');
  const absentDays = byStatus('absent');
  const onLeaveDays = byStatus('on-leave');
  const attendanceRate = rows.length ? Number(((completed / rows.length) * 100).toFixed(2)) : 0;
  return { month: query.month || range.from.slice(0, 7), fromDate: range.from, toDate: range.to, recordedDays: rows.length, presentDays, lateDays, absentDays, onLeaveDays, incompleteDays: byStatus('incomplete'), totalMinutes: rows.reduce((total, row) => total + (row.totalMinutes || 0), 0), attendanceRate, presentToday: presentDays, onLeaveToday: onLeaveDays };
}
