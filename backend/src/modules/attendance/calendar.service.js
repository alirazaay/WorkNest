import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { AttendanceHoliday, AttendanceRecord, Department, Employee, EmployeeShiftAssignment, LeaveRequest, Shift, ShiftWeeklySchedule, User } from '../../database/models/index.js';
import { recordAudit } from '../../services/audit.service.js';
import { AppError } from '../../middleware/error.js';

function dateList(fromDate, toDate) {
  const dates = [];
  for (let cursor = new Date(`${fromDate}T00:00:00Z`), end = new Date(`${toDate}T00:00:00Z`); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) dates.push(cursor.toISOString().slice(0, 10));
  return dates;
}

async function employeeForUser(auth) {
  const employee = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId, employmentStatus: { [Op.ne]: 'terminated' } } });
  if (!employee) throw new AppError('You do not have an active employee profile', 403, 'EMPLOYEE_PROFILE_REQUIRED');
  return employee;
}

async function scopedEmployees(auth, employeeId) {
  if (auth.role === 'employee') {
    const own = await employeeForUser(auth);
    if (employeeId && Number(employeeId) !== own.id) throw new AppError('You can only view your own attendance calendar', 403, 'FORBIDDEN');
    return [own];
  }
  const where = { tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' } };
  if (auth.role === 'manager') {
    const own = await employeeForUser(auth);
    if (!own.departmentId) throw new AppError('Manager is not assigned to a department', 403, 'NO_MANAGER_DEPARTMENT');
    where.departmentId = own.departmentId;
  }
  if (employeeId) where.id = employeeId;
  const employees = await Employee.findAll({ where, include: [{ model: User, as: 'user', attributes: ['id', 'name', 'avatarUrl'] }, { model: Department, as: 'department', attributes: ['id', 'name'] }], order: [['employeeCode', 'ASC']] });
  if (employeeId && !employees.length) throw new AppError('Employee not found in your scope', 404, 'EMPLOYEE_NOT_FOUND');
  return employees;
}

function applicableAssignment(assignments, date) {
  return assignments.find((assignment) => String(assignment.effectiveFrom) <= date && (!assignment.effectiveTo || String(assignment.effectiveTo) >= date));
}

function isWorkingDay(assignment, date) {
  if (!assignment) return new Date(`${date}T00:00:00Z`).getUTCDay() > 0 && new Date(`${date}T00:00:00Z`).getUTCDay() < 6;
  const schedules = assignment.shift?.weeklySchedules || [];
  if (!schedules.length) return true;
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return schedules.some((schedule) => Number(schedule.weekday) === weekday && schedule.isWorkingDay);
}

function between(date, fromDate, toDate) { return date >= String(fromDate) && date <= String(toDate); }

export async function attendanceCalendar(auth, query) {
  const employees = await scopedEmployees(auth, query.employeeId);
  const employeeIds = employees.map((employee) => employee.id);
  if (!employeeIds.length) return { fromDate: query.fromDate, toDate: query.toDate, items: [], summary: {} };
  const [records, leaves, holidays, assignments] = await Promise.all([
    AttendanceRecord.findAll({ where: { tenantId: auth.tenantId, employeeId: { [Op.in]: employeeIds }, attendanceDate: { [Op.between]: [query.fromDate, query.toDate] } } }),
    LeaveRequest.findAll({ where: { tenantId: auth.tenantId, employeeId: { [Op.in]: employeeIds }, status: 'approved', fromDate: { [Op.lte]: query.toDate }, toDate: { [Op.gte]: query.fromDate } }, attributes: ['id', 'employeeId', 'fromDate', 'toDate', 'totalDays'] }),
    AttendanceHoliday.findAll({ where: { tenantId: auth.tenantId, holidayDate: { [Op.between]: [query.fromDate, query.toDate] } }, attributes: ['id', 'holidayDate', 'name', 'isOptional'] }),
    EmployeeShiftAssignment.findAll({ where: { tenantId: auth.tenantId, employeeId: { [Op.in]: employeeIds }, effectiveFrom: { [Op.lte]: query.toDate }, [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: query.fromDate } }] }, include: [{ model: Shift, as: 'shift', include: [{ model: ShiftWeeklySchedule, as: 'weeklySchedules', attributes: ['weekday', 'isWorkingDay'] }] }] })
  ]);
  const recordMap = new Map(records.map((record) => [`${record.employeeId}:${record.attendanceDate}`, record]));
  const holidayMap = new Map(holidays.map((holiday) => [String(holiday.holidayDate), holiday]));
  const dates = dateList(query.fromDate, query.toDate);
  const items = [];
  for (const employee of employees) {
    const employeeAssignments = assignments.filter((assignment) => assignment.employeeId === employee.id).sort((a, b) => String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)));
    const employeeLeaves = leaves.filter((leave) => leave.employeeId === employee.id);
    for (const date of dates) {
      const record = recordMap.get(`${employee.id}:${date}`);
      const holiday = holidayMap.get(date);
      const leave = employeeLeaves.find((item) => between(date, item.fromDate, item.toDate));
      const assignment = applicableAssignment(employeeAssignments, date);
      const workingDay = isWorkingDay(assignment, date);
      let status = 'off';
      if (holiday) status = 'holiday';
      else if (leave) status = 'leave';
      else if (record) status = Number(record.overtimeMinutes || 0) > 0 ? 'overtime' : record.status;
      else if (workingDay) status = 'absent';
      items.push({ date, employeeId: employee.id, employee: employee.user?.name || 'Employee', employeeCode: employee.employeeCode, department: employee.department?.name || null, status, workingDay, holiday: holiday ? { id: holiday.id, name: holiday.name, isOptional: holiday.isOptional } : null, leave: leave ? { id: leave.id, fromDate: leave.fromDate, toDate: leave.toDate } : null, attendance: record ? { id: record.id, clockIn: record.clockIn, clockOut: record.clockOut, lateMinutes: record.lateMinutes || 0, workedMinutes: record.workedMinutes ?? record.totalMinutes ?? 0, overtimeMinutes: record.overtimeMinutes || 0 } : null, shift: assignment?.shift ? { id: assignment.shift.id, name: assignment.shift.name, startTime: assignment.shift.startTime, endTime: assignment.shift.endTime } : null });
    }
  }
  const summary = items.reduce((result, item) => { result[item.status] = (result[item.status] || 0) + 1; return result; }, {});
  return { fromDate: query.fromDate, toDate: query.toDate, items, summary };
}

export async function listHolidays(auth, query = {}) {
  return AttendanceHoliday.findAll({ where: { tenantId: auth.tenantId, ...(query.fromDate || query.toDate ? { holidayDate: { [Op.between]: [query.fromDate || '1000-01-01', query.toDate || '9999-12-31'] } } : {}) }, order: [['holidayDate', 'ASC']] });
}

export async function createHoliday(auth, input) {
  return sequelize.transaction(async (transaction) => {
    try {
      const holiday = await AttendanceHoliday.create({ tenantId: auth.tenantId, createdBy: auth.userId, ...input }, { transaction });
      await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'attendance_holiday_created', entityType: 'attendance_holiday', entityId: holiday.id, afterData: holiday.toJSON(), transaction });
      return holiday;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') throw new AppError('A holiday already exists for this date', 409, 'DUPLICATE_HOLIDAY');
      throw error;
    }
  });
}

export async function updateHoliday(auth, id, input) {
  return sequelize.transaction(async (transaction) => {
    const holiday = await AttendanceHoliday.findOne({ where: { id, tenantId: auth.tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!holiday) throw new AppError('Holiday not found', 404, 'HOLIDAY_NOT_FOUND');
    const before = holiday.toJSON(); await holiday.update(input, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'attendance_holiday_updated', entityType: 'attendance_holiday', entityId: id, beforeData: before, afterData: holiday.toJSON(), transaction });
    return holiday;
  });
}

export async function deleteHoliday(auth, id) {
  return sequelize.transaction(async (transaction) => {
    const holiday = await AttendanceHoliday.findOne({ where: { id, tenantId: auth.tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!holiday) throw new AppError('Holiday not found', 404, 'HOLIDAY_NOT_FOUND');
    await holiday.destroy({ transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'attendance_holiday_deleted', entityType: 'attendance_holiday', entityId: id, beforeData: holiday.toJSON(), transaction });
    return { deleted: true };
  });
}
