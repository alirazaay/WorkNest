import { Op, fn, col, literal } from 'sequelize';
import { AttendanceRecord, Department, Employee, LeaveRequest, LeaveType, PayrollItem, PayrollRun, User } from '../../database/models/index.js';
import { TenantSetting } from '../../database/models/TenantSetting.js';
import { AppError } from '../../middleware/error.js';

function localDate(timezone = 'Asia/Karachi') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function monthKey(date) { return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`; }
function monthRange(month) { const [year, value] = month.split('-').map(Number); const last = new Date(Date.UTC(year, value, 0)).getUTCDate(); return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }; }
function recentMonths(count = 6) { const now = new Date(); const months = []; for (let i = count - 1; i >= 0; i--) { const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)); months.push(monthKey(d)); } return months; }

async function scope(auth) {
  if (auth.role !== 'manager') return {};
  const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] });
  if (!manager?.departmentId) throw new AppError('Manager is not assigned to a department', 403, 'NO_MANAGER_DEPARTMENT');
  return { departmentId: manager.departmentId };
}

async function ownEmployee(auth) {
  const employee = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId, employmentStatus: { [Op.ne]: 'terminated' } } });
  if (!employee) throw new AppError('You do not have an active employee profile', 403, 'EMPLOYEE_PROFILE_REQUIRED');
  return employee;
}

async function scopedEmployeeIds(auth) {
  if (auth.role === 'admin') return null;
  if (auth.role === 'employee') return [(await ownEmployee(auth)).id];
  const employeeScope = await scope(auth);
  const employees = await Employee.findAll({ where: { tenantId: auth.tenantId, ...employeeScope }, attributes: ['id'] });
  return employees.map((e) => e.id);
}

async function ownPayroll(employeeId, tenantId) {
  return (await PayrollItem.findOne({
    where: { tenantId, employeeId },
    include: [{ model: PayrollRun, as: 'run' }],
    order: [[{ model: PayrollRun, as: 'run' }, 'year', 'DESC'], [{ model: PayrollRun, as: 'run' }, 'month', 'DESC']],
  })) || null;
}

export async function summary(auth) {
  const settings = await TenantSetting.findOne({ where: { tenantId: auth.tenantId } });
  const today = localDate(settings?.timezone);
  const employeeScope = await scope(auth);
  const own = auth.role === 'employee' ? await ownEmployee(auth) : null;

  if (own) {
    const [attendance, pendingLeaves, latestPayslip] = await Promise.all([
      AttendanceRecord.findOne({ where: { tenantId: auth.tenantId, employeeId: own.id, attendanceDate: today } }),
      LeaveRequest.count({ where: { tenantId: auth.tenantId, employeeId: own.id, status: 'pending' } }),
      ownPayroll(own.id, auth.tenantId),
    ]);
    return { role: auth.role, today: { date: today, attendance }, pendingLeaves, latestPayslip };
  }

  const employees = await Employee.findAll({ where: { tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' }, ...employeeScope }, attributes: ['id'] });
  const ids = employees.map((e) => e.id);
  const employeeWhere = ids.length ? { employeeId: { [Op.in]: ids } } : { employeeId: -1 };

  const [presentToday, onLeaveToday, pendingApprovals] = await Promise.all([
    AttendanceRecord.count({ where: { tenantId: auth.tenantId, attendanceDate: today, ...employeeWhere, status: { [Op.in]: ['present', 'late'] } } }),
    LeaveRequest.count({ where: { tenantId: auth.tenantId, status: 'approved', ...employeeWhere, fromDate: { [Op.lte]: today }, toDate: { [Op.gte]: today } } }),
    LeaveRequest.count({ where: { tenantId: auth.tenantId, status: 'pending', ...employeeWhere } }),
  ]);

  return {
    role: auth.role,
    totalEmployees: employees.length,
    presentToday,
    onLeaveToday,
    pendingApprovals,
    attendanceRateToday: employees.length ? Number(((presentToday / employees.length) * 100).toFixed(2)) : 0,
  };
}

/**
 * attendanceTrend — SQL GROUP BY aggregation instead of loading all rows into Node.js memory.
 * Before: fetched every AttendanceRecord row for the period, filtered with JS array methods.
 * After: MySQL does COUNT/SUM per month — O(1) memory, scales to any dataset size.
 */
export async function attendanceTrend(auth, query) {
  const months = recentMonths(query.months || 6);
  const from = monthRange(months[0]).from;
  const to = monthRange(months[months.length - 1]).to;
  const ids = await scopedEmployeeIds(auth);

  const where = { tenantId: auth.tenantId, attendanceDate: { [Op.between]: [from, to] } };
  if (ids) where.employeeId = { [Op.in]: ids };

  const rows = await AttendanceRecord.findAll({
    where,
    attributes: [
      [literal("DATE_FORMAT(attendance_date, '%Y-%m')"), 'month'],
      [fn('COUNT', col('id')), 'total'],
      [fn('SUM', literal("CASE WHEN status = 'present' THEN 1 ELSE 0 END")), 'presentDays'],
      [fn('SUM', literal("CASE WHEN status = 'late' THEN 1 ELSE 0 END")), 'lateDays'],
    ],
    group: [literal("DATE_FORMAT(attendance_date, '%Y-%m')")],
    raw: true,
  });

  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return months.map((month) => {
    const row = byMonth.get(month);
    const total = Number(row?.total || 0);
    const presentDays = Number(row?.presentDays || 0);
    const lateDays = Number(row?.lateDays || 0);
    const attended = presentDays + lateDays;
    return { month, recordedDays: total, presentDays, lateDays, attendanceRate: total ? Number(((attended / total) * 100).toFixed(2)) : 0 };
  });
}

/**
 * headcount — SQL GROUP BY instead of JS Map reduce.
 * Before: fetched all employees with Department included, then reduced in JS.
 * After: COUNT(*) GROUP BY department_id — single efficient SQL query.
 */
export async function headcount(auth) {
  const ids = await scopedEmployeeIds(auth);
  const where = { tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' } };
  if (ids) where.id = { [Op.in]: ids };

  const rows = await Employee.findAll({
    where,
    attributes: ['departmentId', [fn('COUNT', col('Employee.id')), 'count']],
    include: [{ model: Department, as: 'department', attributes: ['id', 'name'], required: false }],
    group: ['Employee.department_id', 'department.id', 'department.name'],
    order: [[literal('count'), 'DESC']],
    raw: true,
    nest: true,
  });

  return rows.map((row) => ({
    departmentId: row.departmentId || null,
    department: row.department?.name || 'Unassigned',
    count: Number(row.count),
  }));
}

export async function payrollTrend(auth, query) {
  const months = recentMonths(query.months || 6);
  const runs = await PayrollRun.findAll({
    where: {
      tenantId: auth.tenantId,
      [Op.or]: months.map((m) => ({ year: Number(m.slice(0, 4)), month: Number(m.slice(5)) })),
      status: { [Op.in]: ['generated', 'approved', 'locked'] },
    },
    order: [['year', 'ASC'], ['month', 'ASC']],
  });
  const byMonth = new Map(runs.map((run) => [`${run.year}-${String(run.month).padStart(2, '0')}`, run]));
  return months.map((month) => {
    const run = byMonth.get(month);
    return { month, runId: run?.id || null, gross: Number(run?.totalGross || 0), deductions: Number(run?.totalDeductions || 0), net: Number(run?.totalNet || 0), status: run?.status || 'not_generated' };
  });
}

/**
 * activity — Promise.allSettled so one failing source doesn't block the entire feed.
 * Before: Promise.all — one failed query returns nothing.
 * After: each source is independent; partial results are returned on failure.
 */
export async function activity(auth, query) {
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const ids = await scopedEmployeeIds(auth);
  const employeeWhere = { tenantId: auth.tenantId };
  if (ids) employeeWhere.id = { [Op.in]: ids };

  const [leavesResult, employeesResult, payrollResult] = await Promise.allSettled([
    LeaveRequest.findAll({
      where: { tenantId: auth.tenantId, ...(ids ? { employeeId: { [Op.in]: ids } } : {}) },
      include: [
        { model: Employee, as: 'employee', include: [{ model: User, as: 'user', attributes: ['name', 'avatarUrl'] }] },
        { model: LeaveType, as: 'leaveType', attributes: ['name'] },
      ],
      order: [['applied_at', 'DESC']],
      limit,
    }),
    Employee.findAll({
      where: employeeWhere,
      include: [{ model: User, as: 'user', attributes: ['name', 'avatarUrl'] }],
      order: [['id', 'DESC']],
      limit,
    }),
    PayrollRun.findAll({ where: { tenantId: auth.tenantId }, order: [['year', 'DESC'], ['month', 'DESC']], limit }),
  ]);

  const leaves = leavesResult.status === 'fulfilled' ? leavesResult.value : [];
  const employees = employeesResult.status === 'fulfilled' ? employeesResult.value : [];
  const payroll = payrollResult.status === 'fulfilled' ? payrollResult.value : [];

  return [
    ...leaves.map((item) => ({ type: 'leave_request', id: item.id, message: `${item.employee?.user?.name || 'Employee'} submitted ${item.leaveType?.name || 'leave'} request`, avatarUrl: item.employee?.user?.avatarUrl || null, status: item.status, createdAt: item.createdAt })),
    ...employees.map((item) => ({ type: 'employee_added', id: item.id, message: `${item.user?.name || 'Employee'} joined the workspace`, avatarUrl: item.user?.avatarUrl || null, status: item.employmentStatus, createdAt: item.createdAt })),
    ...payroll.map((item) => ({ type: 'payroll_run', id: item.id, message: `Payroll for ${item.month}/${item.year} is ${item.status}`, status: item.status, createdAt: item.createdAt })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
}
