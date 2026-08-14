import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Employee, EmployeeShiftAssignment, Shift, ShiftWeeklySchedule, User } from '../../database/models/index.js';
import { recordAudit } from '../../services/audit.service.js';
import { AppError } from '../../middleware/error.js';

const shiftInclude = [{ model: ShiftWeeklySchedule, as: 'weeklySchedules', attributes: ['id', 'weekday', 'isWorkingDay'] }, { model: User, as: 'creator', attributes: ['id', 'name'] }];

async function getShift(auth, id, transaction) {
  const shift = await Shift.findOne({ where: { id, tenantId: auth.tenantId }, include: shiftInclude, transaction });
  if (!shift) throw new AppError('Shift not found', 404, 'SHIFT_NOT_FOUND');
  return shift;
}

async function getEmployee(auth, employeeId, transaction) {
  const employee = await Employee.findOne({ where: { id: employeeId, tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' } }, transaction });
  if (!employee) throw new AppError('Employee not found in this workspace', 404, 'EMPLOYEE_NOT_FOUND');
  return employee;
}

function overlapWhere(effectiveFrom, effectiveTo) {
  return { [Op.and]: [{ effectiveFrom: { [Op.lte]: effectiveTo || '9999-12-31' } }, { [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: effectiveFrom } }] }] };
}

export async function listShifts(auth) {
  return Shift.findAll({ where: { tenantId: auth.tenantId }, include: shiftInclude, order: [['isActive', 'DESC'], ['name', 'ASC']] });
}

export async function createShift(auth, input) {
  return sequelize.transaction(async (transaction) => {
    const shift = await Shift.create({ tenantId: auth.tenantId, createdBy: auth.userId, ...input }, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'attendance_shift_created', entityType: 'shift', entityId: shift.id, afterData: shift.toJSON(), transaction });
    return getShift(auth, shift.id, transaction);
  });
}

export async function updateShift(auth, id, input) {
  return sequelize.transaction(async (transaction) => {
    const shift = await getShift(auth, id, transaction);
    const before = shift.toJSON();
    await shift.update(input, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'attendance_shift_updated', entityType: 'shift', entityId: id, beforeData: before, afterData: shift.toJSON(), transaction });
    return shift;
  });
}

export async function getShiftSchedule(auth, id, transaction) {
  const shift = await getShift(auth, id, transaction);
  return { shiftId: shift.id, days: shift.weeklySchedules || [] };
}

export async function replaceShiftSchedule(auth, id, days) {
  return sequelize.transaction(async (transaction) => {
    const shift = await getShift(auth, id, transaction);
    await ShiftWeeklySchedule.destroy({ where: { tenantId: auth.tenantId, shiftId: shift.id }, transaction });
    if (days.length) await ShiftWeeklySchedule.bulkCreate(days.map((day) => ({ tenantId: auth.tenantId, shiftId: shift.id, ...day })), { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'attendance_shift_schedule_replaced', entityType: 'shift', entityId: id, afterData: { days }, transaction });
    return getShiftSchedule(auth, id, transaction);
  });
}

export async function listEmployeeAssignments(auth, employeeId) {
  await getEmployee(auth, employeeId);
  return EmployeeShiftAssignment.findAll({ where: { tenantId: auth.tenantId, employeeId }, include: [{ model: Shift, as: 'shift', include: [{ model: ShiftWeeklySchedule, as: 'weeklySchedules' }] }], order: [['effectiveFrom', 'DESC']] });
}

export async function assignEmployeeShift(auth, employeeId, input) {
  return sequelize.transaction(async (transaction) => {
    await getEmployee(auth, employeeId, transaction);
    const shift = await Shift.findOne({ where: { id: input.shiftId, tenantId: auth.tenantId, isActive: true }, transaction });
    if (!shift) throw new AppError('Active shift not found', 404, 'SHIFT_NOT_FOUND');
    const overlap = await EmployeeShiftAssignment.findOne({ where: { tenantId: auth.tenantId, employeeId, ...overlapWhere(input.effectiveFrom, input.effectiveTo) }, transaction, lock: transaction.LOCK.UPDATE });
    if (overlap) throw new AppError('The employee already has an overlapping shift assignment', 409, 'SHIFT_ASSIGNMENT_OVERLAP');
    const assignment = await EmployeeShiftAssignment.create({ tenantId: auth.tenantId, employeeId, assignedBy: auth.userId, ...input }, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'attendance_shift_assigned', entityType: 'employee_shift_assignment', entityId: assignment.id, afterData: assignment.toJSON(), transaction });
    return assignment;
  });
}

export async function updateEmployeeShift(auth, employeeId, id, input) {
  return sequelize.transaction(async (transaction) => {
    await getEmployee(auth, employeeId, transaction);
    const assignment = await EmployeeShiftAssignment.findOne({ where: { id, tenantId: auth.tenantId, employeeId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!assignment) throw new AppError('Shift assignment not found', 404, 'SHIFT_ASSIGNMENT_NOT_FOUND');
    const values = { ...input };
    if (values.shiftId) {
      const shift = await Shift.findOne({ where: { id: values.shiftId, tenantId: auth.tenantId, isActive: true }, transaction });
      if (!shift) throw new AppError('Active shift not found', 404, 'SHIFT_NOT_FOUND');
    }
    const effectiveFrom = values.effectiveFrom || assignment.effectiveFrom;
    const effectiveTo = values.effectiveTo === undefined ? assignment.effectiveTo : values.effectiveTo;
    const overlap = await EmployeeShiftAssignment.findOne({ where: { tenantId: auth.tenantId, employeeId, id: { [Op.ne]: id }, ...overlapWhere(effectiveFrom, effectiveTo) }, transaction, lock: transaction.LOCK.UPDATE });
    if (overlap) throw new AppError('The employee already has an overlapping shift assignment', 409, 'SHIFT_ASSIGNMENT_OVERLAP');
    const before = assignment.toJSON();
    await assignment.update(values, { transaction });
    await recordAudit({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'attendance_shift_assignment_updated', entityType: 'employee_shift_assignment', entityId: id, beforeData: before, afterData: assignment.toJSON(), transaction });
    return assignment;
  });
}
