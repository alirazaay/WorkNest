import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Department, Employee, EmployeeDocument, EmployeeSalaryStructure, Tenant, User } from '../../database/models/index.js';
import { AppError } from '../../middleware/error.js';

function serializeEmployee(employee) {
  const json = employee.toJSON();
  if (json.user) delete json.user.passwordHash;
  return json;
}

async function assertDepartment(tenantId, departmentId, transaction) {
  if (!departmentId) return null;
  const department = await Department.findOne({ where: { id: departmentId, tenantId }, transaction });
  if (!department) throw new AppError('Department does not belong to this workspace', 422, 'INVALID_DEPARTMENT');
  return department;
}

async function assertHead(tenantId, headEmployeeId, transaction) {
  if (!headEmployeeId) return null;
  const employee = await Employee.findOne({ where: { id: headEmployeeId, tenantId, employmentStatus: { [Op.ne]: 'terminated' } }, transaction });
  if (!employee) throw new AppError('Department head does not belong to this workspace', 422, 'INVALID_DEPARTMENT_HEAD');
  return employee;
}

async function nextEmployeeCode(tenantId, transaction) {
  const tenant = await Tenant.findByPk(tenantId, { transaction, lock: transaction.LOCK.UPDATE });
  const prefix = tenant.companyName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'EMP';
  const last = await Employee.findOne({ where: { tenantId }, order: [['id', 'DESC']], transaction, lock: transaction.LOCK.UPDATE });
  const sequence = last?.employeeCode?.match(/(\d+)$/)?.[1];
  return `${prefix}-${String(Number(sequence || 0) + 1).padStart(4, '0')}`;
}

async function assertPlanCapacity(tenantId, transaction) {
  const tenant = await Tenant.findByPk(tenantId, { transaction, lock: transaction.LOCK.UPDATE });
  const count = await Employee.count({ where: { tenantId, employmentStatus: { [Op.ne]: 'terminated' } }, transaction });
  if (count >= tenant.employeeLimit) throw new AppError(`Your ${tenant.plan} plan allows up to ${tenant.employeeLimit} active employees`, 409, 'EMPLOYEE_LIMIT_REACHED');
}

export async function listDepartments(tenantId) {
  return Department.findAll({ where: { tenantId }, include: [{ model: Employee, as: 'head', attributes: ['id', 'employeeCode'], include: [{ model: User, as: 'user', attributes: ['name'] }] }, { model: Employee, as: 'employees', attributes: ['id'], where: { employmentStatus: { [Op.ne]: 'terminated' } }, required: false }], order: [['name', 'ASC']] });
}

export async function createDepartment(tenantId, input) {
  return sequelize.transaction(async (transaction) => {
    await assertHead(tenantId, input.headEmployeeId, transaction);
    try { return await Department.create({ tenantId, name: input.name, headEmployeeId: input.headEmployeeId ?? null }, { transaction }); } catch (error) { if (error.name === 'SequelizeUniqueConstraintError') throw new AppError('A department with this name already exists', 409, 'DUPLICATE_DEPARTMENT'); throw error; }
  });
}

export async function updateDepartment(tenantId, id, input) {
  const department = await Department.findOne({ where: { id, tenantId } });
  if (!department) throw new AppError('Department not found', 404, 'DEPARTMENT_NOT_FOUND');
  await assertHead(tenantId, input.headEmployeeId, null);
  Object.assign(department, input); await department.save(); return department;
}

export async function deleteDepartment(tenantId, id) {
  const department = await Department.findOne({ where: { id, tenantId } });
  if (!department) throw new AppError('Department not found', 404, 'DEPARTMENT_NOT_FOUND');
  const employeeCount = await Employee.count({ where: { tenantId, departmentId: id, employmentStatus: { [Op.ne]: 'terminated' } } });
  if (employeeCount > 0) throw new AppError('Department cannot be deleted while it has active employees', 409, 'DEPARTMENT_NOT_EMPTY');
  await department.destroy();
}

const employeeInclude = [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatarUrl', 'role', 'status'] }, { model: Department, as: 'department', attributes: ['id', 'name'] }, { model: EmployeeSalaryStructure, as: 'salaryStructures', separate: true, order: [['effectiveFrom', 'DESC']] }];

async function managerScope(auth) {
  if (auth.role !== 'manager') return {};
  const manager = await Employee.findOne({ where: { tenantId: auth.tenantId, userId: auth.userId }, attributes: ['departmentId'] });
  if (!manager?.departmentId) throw new AppError('Manager is not assigned to a department', 403, 'NO_MANAGER_DEPARTMENT');
  return { departmentId: manager.departmentId };
}

export async function listEmployees(auth, query) {
  const page = Math.max(1, Number(query.page || 1)); const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 25))); const scope = await managerScope(auth);
  const where = { tenantId: auth.tenantId, ...scope };
  if (query.departmentId) where.departmentId = Number(query.departmentId);
  if (query.status) where.employmentStatus = query.status;
  if (query.search) where[Op.or] = [{ employeeCode: { [Op.like]: `%${query.search}%` } }, { '$user.name$': { [Op.like]: `%${query.search}%` } }];
  const result = await Employee.findAndCountAll({ where, include: [{ ...employeeInclude[0], required: false }, employeeInclude[1]], order: [['id', 'DESC']], limit: pageSize, offset: (page - 1) * pageSize, distinct: true });
  return { items: result.rows.map(serializeEmployee), pagination: { page, pageSize, total: result.count, totalPages: Math.ceil(result.count / pageSize) } };
}

export async function getEmployee(auth, id) {
  const scope = await managerScope(auth); const employee = await Employee.findOne({ where: { id, tenantId: auth.tenantId, ...scope }, include: employeeInclude });
  if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  return serializeEmployee(employee);
}

export async function createEmployee(tenantId, input) {
  return sequelize.transaction(async (transaction) => {
    await assertPlanCapacity(tenantId, transaction); await assertDepartment(tenantId, input.departmentId, transaction);
    if (await User.findOne({ where: { email: input.email }, transaction })) throw new AppError('A user with this email already exists', 409, 'EMAIL_IN_USE');
    const user = await User.create({ tenantId, name: input.name, email: input.email, avatarUrl: input.avatarUrl || null, passwordHash: await bcrypt.hash(input.password, 12), role: input.role, status: 'active', emailVerifiedAt: new Date() }, { transaction });
    const employee = await Employee.create({ tenantId, userId: user.id, employeeCode: await nextEmployeeCode(tenantId, transaction), departmentId: input.departmentId ?? null, designation: input.designation, phone: input.phone, cnic: input.cnic, dateOfBirth: input.dateOfBirth, gender: input.gender, address: input.address, joiningDate: input.joiningDate || new Date().toISOString().slice(0, 10), employmentType: input.employmentType }, { transaction });
    if (input.salary) await EmployeeSalaryStructure.create({ tenantId, employeeId: employee.id, effectiveFrom: input.salary.effectiveFrom || employee.joiningDate, ...input.salary }, { transaction });
    return serializeEmployee(await Employee.findByPk(employee.id, { include: employeeInclude, transaction }));
  });
}

export async function updateEmployee(auth, id, input) {
  const employee = await Employee.findOne({ where: { id, tenantId: auth.tenantId } });
  if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  await assertDepartment(auth.tenantId, input.departmentId, null);
  const { name, role, avatarUrl, salary, ...employeeFields } = input; Object.assign(employee, employeeFields); await employee.save();
  if (name || role || avatarUrl !== undefined) { const user = await User.findOne({ where: { id: employee.userId, tenantId: auth.tenantId } }); if (name) user.name = name; if (role) user.role = role; if (avatarUrl !== undefined) user.avatarUrl = avatarUrl || null; await user.save(); }
  if (salary) await addSalaryStructure(auth, id, salary);
  return getEmployee(auth, id);
}

export async function updateEmployeeStatus(auth, id, input) {
  const employee = await Employee.findOne({ where: { id, tenantId: auth.tenantId }, include: [{ model: User, as: 'user' }] });
  if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  employee.employmentStatus = input.status; employee.terminationDate = input.status === 'terminated' ? new Date() : null; employee.terminationReason = input.status === 'terminated' ? input.reason || null : null; await employee.save();
  employee.user.status = input.status === 'terminated' ? 'inactive' : 'active'; await employee.user.save({ fields: ['status'] });
  return serializeEmployee(await Employee.findByPk(id, { include: employeeInclude }));
}

export async function deleteEmployee(auth, id) { return updateEmployeeStatus(auth, id, { status: 'terminated', reason: 'Deleted by administrator' }); }

export async function addSalaryStructure(auth, employeeId, input) {
  const employee = await Employee.findOne({ where: { id: employeeId, tenantId: auth.tenantId } }); if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  await EmployeeSalaryStructure.update({ effectiveTo: new Date(new Date(input.effectiveFrom).getTime() - 86_400_000) }, { where: { tenantId: auth.tenantId, employeeId, effectiveTo: null } });
  return EmployeeSalaryStructure.create({ tenantId: auth.tenantId, employeeId, ...input });
}

export async function addDocument(auth, employeeId, file, documentType) {
  const employee = await Employee.findOne({ where: { id: employeeId, tenantId: auth.tenantId } }); if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  return EmployeeDocument.create({ tenantId: auth.tenantId, employeeId, documentType, fileName: file.originalname, storageKey: file.path, mimeType: file.mimetype, fileSize: file.size, uploadedBy: auth.userId });
}

export async function listDocuments(auth, employeeId) {
  const employee = await Employee.findOne({ where: { id: employeeId, tenantId: auth.tenantId } }); if (!employee) throw new AppError('Employee not found', 404, 'EMPLOYEE_NOT_FOUND');
  return EmployeeDocument.findAll({ where: { tenantId: auth.tenantId, employeeId }, order: [['createdAt', 'DESC']] });
}
