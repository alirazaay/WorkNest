import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database.js';
import { Department, Employee, EmployeeSalaryStructure, LeaveType, Tenant, TenantSetting, User } from './models/index.js';

async function seed() {
  await sequelize.authenticate();
  const [tenant] = await Tenant.findOrCreate({ where: { slug: 'acme-demo' }, defaults: { companyName: 'Acme Demo', slug: 'acme-demo', industry: 'Technology', plan: 'enterprise', employeeLimit: 1000 } });
  await TenantSetting.findOrCreate({ where: { tenantId: tenant.id }, defaults: { tenantId: tenant.id } });
  const leaveDefaults = [['Annual Leave', 'annual', true, 20], ['Sick Leave', 'sick', true, 10], ['Casual Leave', 'casual', true, 6], ['Unpaid Leave', 'unpaid', false, 365]];
  for (const [name, code, isPaid, annualAllowance] of leaveDefaults) await LeaveType.findOrCreate({ where: { tenantId: tenant.id, code }, defaults: { tenantId: tenant.id, name, code, isPaid, annualAllowance, requiresApproval: true, isActive: true } });
  const [admin] = await User.findOrCreate({ where: { email: 'admin@acme-demo.local' }, defaults: { tenantId: tenant.id, name: 'Amara Mensah', email: 'admin@acme-demo.local', passwordHash: await bcrypt.hash('ChangeMe123!', 12), role: 'admin', status: 'active', emailVerifiedAt: new Date() } });
  const [engineering] = await Department.findOrCreate({ where: { tenantId: tenant.id, name: 'Engineering' }, defaults: { tenantId: tenant.id, name: 'Engineering' } });
  const people = [['Jordan Rivera', 'jordan@acme-demo.local', 'JR-0001', 'Senior Engineer', 180000], ['Maya Chen', 'maya@acme-demo.local', 'MC-0002', 'Product Designer', 145000]];
  for (const [name, email, code, designation, salary] of people) {
    const [user] = await User.findOrCreate({ where: { email }, defaults: { tenantId: tenant.id, name, email, passwordHash: await bcrypt.hash('ChangeMe123!', 12), role: 'employee', status: 'active', emailVerifiedAt: new Date() } });
    const [employee] = await Employee.findOrCreate({ where: { userId: user.id }, defaults: { tenantId: tenant.id, userId: user.id, departmentId: engineering.id, employeeCode: code, designation, joiningDate: new Date(), employmentStatus: 'active', employmentType: 'full-time' } });
    await EmployeeSalaryStructure.findOrCreate({ where: { employeeId: employee.id, effectiveFrom: new Date().toISOString().slice(0, 10) }, defaults: { tenantId: tenant.id, employeeId: employee.id, effectiveFrom: new Date().toISOString().slice(0, 10), baseSalary: salary, houseAllowance: salary * .1, transportAllowance: 10000, medicalAllowance: 5000 } });
  }
  console.log('Demo data ready. Admin: admin@acme-demo.local / ChangeMe123!');
}

seed().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => sequelize.close());
