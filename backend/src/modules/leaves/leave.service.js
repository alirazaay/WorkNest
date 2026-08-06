import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Department, Employee, LeaveBalance, LeaveRequest, LeaveType, Notification, User } from '../../database/models/index.js';
import { AppError } from '../../middleware/error.js';
import { sendLeaveDecisionEmail, sendLeaveRequestEmail } from '../../services/email.service.js';
import { createNotification } from '../../services/notification.service.js';

function daysInclusive(fromDate, toDate) {
  const start = new Date(`${fromDate}T00:00:00Z`); const end = new Date(`${toDate}T00:00:00Z`);
  return Math.floor((end - start) / 86_400_000) + 1;
}

function employeeInclude() {
  return { model: Employee, as: 'employee', attributes: ['id', 'employeeCode', 'departmentId'], include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }, { model: Department, as: 'department', attributes: ['id', 'name'] }] };
}

async function employeeForUser(auth) {
  const employee = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId, employmentStatus: { [Op.ne]: 'terminated' } }, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }] });
  if (!employee) throw new AppError('You do not have an active employee profile', 403, 'EMPLOYEE_PROFILE_REQUIRED');
  return employee;
}

async function managerDepartment(auth) {
  if (auth.role !== 'manager') return null;
  const employee = await employeeForUser(auth);
  if (!employee.departmentId) throw new AppError('Manager is not assigned to a department', 403, 'NO_MANAGER_DEPARTMENT');
  return employee.departmentId;
}

async function scopedEmployee(auth, employeeId) {
  const departmentId = await managerDepartment(auth);
  const employee = await Employee.findOne({ where: { id: employeeId, tenantId: auth.tenantId, ...(departmentId ? { departmentId } : {}) } });
  if (!employee) throw new AppError('Employee not found in your scope', 404, 'EMPLOYEE_NOT_FOUND');
  return employee;
}

export async function ensureLeaveBalances(tenantId, employeeId, year = new Date().getUTCFullYear(), transaction) {
  const types = await LeaveType.findAll({ where: { tenantId, isActive: true }, transaction });
  for (const type of types) {
    await LeaveBalance.findOrCreate({ where: { tenantId, employeeId, leaveTypeId: type.id, year }, defaults: { allocatedDays: type.annualAllowance, usedDays: 0, pendingDays: 0 }, transaction });
  }
}

export async function listLeaveTypes(tenantId) {
  return LeaveType.findAll({ where: { tenantId, isActive: true }, order: [['name', 'ASC']] });
}

export async function createLeaveType(tenantId, input) {
  try { return await LeaveType.create({ tenantId, ...input }); } catch (error) { if (error.name === 'SequelizeUniqueConstraintError') throw new AppError('A leave type with this code already exists', 409, 'DUPLICATE_LEAVE_TYPE'); throw error; }
}

export async function listBalances(auth, employeeId) {
  const employee = employeeId ? await scopedEmployee(auth, employeeId) : await employeeForUser(auth);
  const year = new Date().getUTCFullYear(); await ensureLeaveBalances(auth.tenantId, employee.id, year);
  return LeaveBalance.findAll({ where: { tenantId: auth.tenantId, employeeId: employee.id, year }, include: [{ model: LeaveType, as: 'leaveType', attributes: ['id', 'name', 'code', 'isPaid'] }], order: [['leaveTypeId', 'ASC']] });
}

async function assertLeaveType(tenantId, id, transaction) {
  const type = await LeaveType.findOne({ where: { id, tenantId, isActive: true }, transaction });
  if (!type) throw new AppError('Leave type not found', 422, 'INVALID_LEAVE_TYPE');
  return type;
}

async function assertNoOverlap(tenantId, employeeId, fromDate, toDate, transaction, excludeId = null) {
  const where = { tenantId, employeeId, status: { [Op.in]: ['pending', 'approved'] }, fromDate: { [Op.lte]: toDate }, toDate: { [Op.gte]: fromDate } };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  if (await LeaveRequest.findOne({ where, transaction })) throw new AppError('This leave period overlaps another pending or approved request', 409, 'LEAVE_OVERLAP');
}

export async function createLeaveRequest(auth, input) {
  const employee = await employeeForUser(auth); const totalDays = daysInclusive(input.fromDate, input.toDate); const year = Number(input.fromDate.slice(0, 4));
  let created;
  await sequelize.transaction(async (transaction) => {
    const type = await assertLeaveType(auth.tenantId, input.leaveTypeId, transaction); await assertNoOverlap(auth.tenantId, employee.id, input.fromDate, input.toDate, transaction);
    await ensureLeaveBalances(auth.tenantId, employee.id, year, transaction);
    const balance = await LeaveBalance.findOne({ where: { tenantId: auth.tenantId, employeeId: employee.id, leaveTypeId: type.id, year }, transaction, lock: transaction.LOCK.UPDATE });
    if (type.isPaid && balance.allocatedDays - balance.usedDays - balance.pendingDays < totalDays) throw new AppError('Insufficient leave balance', 409, 'INSUFFICIENT_LEAVE_BALANCE');
    balance.pendingDays += totalDays; await balance.save({ fields: ['pendingDays'], transaction });
    created = await LeaveRequest.create({ tenantId: auth.tenantId, employeeId: employee.id, leaveTypeId: type.id, fromDate: input.fromDate, toDate: input.toDate, totalDays, reason: input.reason, status: 'pending' }, { transaction });
    const managers = await User.findAll({ where: { tenantId: auth.tenantId, role: { [Op.in]: ['admin', 'manager'] }, status: 'active' }, attributes: ['id', 'email'], transaction });
    await Promise.all(managers.map((manager) => createNotification({ tenantId: auth.tenantId, userId: manager.id, type: 'leave_requested', title: 'New leave request', message: `${employee.user?.name || 'An employee'} requested ${totalDays} day(s) of leave`, entityType: 'leave_request', entityId: created.id, transaction })));
  });
  await sendLeaveRequestEmail({ tenantId: auth.tenantId, employeeEmail: employee.user?.email });
  return getLeaveRequest(auth, created.id);
}

function requestWhere(auth, query, employeeId = null) {
  const where = { tenantId: auth.tenantId, ...(employeeId ? { employeeId } : {}) };
  if (query.status) where.status = query.status;
  if (!employeeId && query.employeeId) where.employeeId = query.employeeId;
  if (query.fromDate || query.toDate) { where.fromDate = { [Op.lte]: query.toDate || '9999-12-31' }; where.toDate = { [Op.gte]: query.fromDate || '1000-01-01' }; }
  return where;
}

export async function listLeaveRequests(auth, query) {
  let employeeId = null; const departmentId = await managerDepartment(auth);
  if (auth.role === 'employee') employeeId = (await employeeForUser(auth)).id;
  const where = requestWhere(auth, query, employeeId);
  const include = [employeeInclude(), { model: LeaveType, as: 'leaveType', attributes: ['id', 'name', 'code', 'isPaid'] }];
  if (departmentId) include[0].where = { departmentId }, include[0].required = true;
  const page = Math.max(1, Number(query.page || 1)); const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 25)));
  const result = await LeaveRequest.findAndCountAll({ where, include, order: [['appliedAt', 'DESC']], limit: pageSize, offset: (page - 1) * pageSize, distinct: true });
  return { items: result.rows, pagination: { page, pageSize, total: result.count, totalPages: Math.ceil(result.count / pageSize) } };
}

export async function getLeaveRequest(auth, id) {
  const request = await LeaveRequest.findOne({ where: { id, tenantId: auth.tenantId }, include: [employeeInclude(), { model: LeaveType, as: 'leaveType' }, { model: User, as: 'reviewer', attributes: ['id', 'name'] }] });
  if (!request) throw new AppError('Leave request not found', 404, 'LEAVE_NOT_FOUND');
  if (auth.role === 'employee' && request.employee.userId !== auth.userId) throw new AppError('Leave request not found', 404, 'LEAVE_NOT_FOUND');
  return request;
}

async function reviewLeave(auth, id, status, comment) {
  let reviewed;
  await sequelize.transaction(async (transaction) => {
    const request = await LeaveRequest.findOne({ where: { id, tenantId: auth.tenantId }, include: [employeeInclude(), { model: LeaveType, as: 'leaveType' }], transaction, lock: transaction.LOCK.UPDATE });
    if (!request) throw new AppError('Leave request not found', 404, 'LEAVE_NOT_FOUND');
    if (auth.role === 'manager' && request.employee.departmentId !== (await managerDepartment(auth))) throw new AppError('You cannot review this request', 403, 'FORBIDDEN');
    if (request.status !== 'pending') throw new AppError('Only pending requests can be reviewed', 409, 'LEAVE_ALREADY_REVIEWED');
    const year = Number(String(request.fromDate).slice(0, 4)); await ensureLeaveBalances(auth.tenantId, request.employeeId, year, transaction);
    const balance = await LeaveBalance.findOne({ where: { tenantId: auth.tenantId, employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, year }, transaction, lock: transaction.LOCK.UPDATE });
    if (status === 'approved' && request.leaveType.isPaid && balance.allocatedDays - balance.usedDays - balance.pendingDays + request.totalDays < request.totalDays) throw new AppError('Insufficient leave balance', 409, 'INSUFFICIENT_LEAVE_BALANCE');
    balance.pendingDays = Math.max(0, balance.pendingDays - request.totalDays); if (status === 'approved') balance.usedDays += request.totalDays; await balance.save({ fields: ['pendingDays', 'usedDays'], transaction });
    request.status = status; request.reviewedBy = auth.userId; request.reviewedAt = new Date(); request.reviewerComment = comment || null; await request.save({ fields: ['status', 'reviewedBy', 'reviewedAt', 'reviewerComment'], transaction });
    const title = status === 'approved' ? 'Leave request approved' : 'Leave request rejected'; const message = status === 'approved' ? `Your ${request.leaveType.name} request was approved.` : `Your ${request.leaveType.name} request was rejected.${comment ? ` Reason: ${comment}` : ''}`;
    await createNotification({ tenantId: auth.tenantId, userId: request.employee.userId, type: `leave_${status}`, title, message, entityType: 'leave_request', entityId: request.id, transaction });
    reviewed = request;
  });
  await sendLeaveDecisionEmail({ email: reviewed.employee.user.email, status, comment });
  return getLeaveRequest(auth, id);
}

export async function approveLeave(auth, id) { return reviewLeave(auth, id, 'approved'); }
export async function rejectLeave(auth, id, comment) { return reviewLeave(auth, id, 'rejected', comment); }

export async function cancelLeave(auth, id) {
  const employee = await employeeForUser(auth); let request;
  await sequelize.transaction(async (transaction) => {
    request = await LeaveRequest.findOne({ where: { id, tenantId: auth.tenantId, employeeId: employee.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (!request) throw new AppError('Leave request not found', 404, 'LEAVE_NOT_FOUND'); if (request.status !== 'pending') throw new AppError('Only pending requests can be cancelled', 409, 'LEAVE_NOT_PENDING');
    const balance = await LeaveBalance.findOne({ where: { tenantId: auth.tenantId, employeeId: employee.id, leaveTypeId: request.leaveTypeId, year: Number(String(request.fromDate).slice(0, 4)) }, transaction, lock: transaction.LOCK.UPDATE });
    if (balance) { balance.pendingDays = Math.max(0, balance.pendingDays - request.totalDays); await balance.save({ fields: ['pendingDays'], transaction }); }
    request.status = 'cancelled'; await request.save({ fields: ['status'], transaction });
  });
  return getLeaveRequest(auth, id);
}

export async function leaveCalendar(auth, query) {
  const requests = await listLeaveRequests(auth, { fromDate: query.fromDate, toDate: query.toDate, page: 1, pageSize: 100 });
  return requests.items.filter((item) => item.status === 'approved').map((item) => ({ id: item.id, employee: item.employee.user.name, employeeId: item.employeeId, department: item.employee.department?.name, leaveType: item.leaveType.name, fromDate: item.fromDate, toDate: item.toDate, totalDays: item.totalDays }));
}

export async function listNotifications(auth, query = {}) {
  const limit = Math.min(100, Math.max(1, Number(query.limit || 30))); return Notification.findAll({ where: { tenantId: auth.tenantId, userId: auth.userId }, order: [['createdAt', 'DESC']], limit });
}
export async function markNotificationRead(auth, id) { const notification = await Notification.findOne({ where: { id, tenantId: auth.tenantId, userId: auth.userId } }); if (!notification) throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND'); notification.isRead = true; notification.readAt = new Date(); await notification.save({ fields: ['isRead', 'readAt'] }); return notification; }
export async function markAllNotificationsRead(auth) { await Notification.update({ isRead: true, readAt: new Date() }, { where: { tenantId: auth.tenantId, userId: auth.userId, isRead: false } }); }
