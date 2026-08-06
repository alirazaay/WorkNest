import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { Department, Employee, Tenant, TenantSetting, User, UserSession } from '../../database/models/index.js';
import { AppError } from '../../middleware/error.js';

const PLAN_PRICES = { starter: 0, growth: 29, enterprise: 99 };

function tenantShape(tenant, employeeCount = 0, departmentCount = 0) {
  return { id: tenant.id, companyName: tenant.companyName, slug: tenant.slug, industry: tenant.industry, plan: tenant.plan, employeeLimit: tenant.employeeLimit, employeeCount, departmentCount, isActive: tenant.isActive, createdAt: tenant.createdAt };
}

async function tenantCounts(tenantId) {
  const [employeeCount, departmentCount] = await Promise.all([Employee.count({ where: { tenantId, employmentStatus: { [Op.ne]: 'terminated' } } }), Department.count({ where: { tenantId } })]);
  return { employeeCount, departmentCount };
}

export async function listTenants(query) {
  const where = {}; if (query.search) where[Op.or] = [{ companyName: { [Op.like]: `%${query.search}%` } }, { slug: { [Op.like]: `%${query.search}%` } }]; if (query.plan) where.plan = query.plan; if (query.status) where.isActive = query.status === 'active';
  const page = Math.max(1, Number(query.page || 1)); const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || 25))); const result = await Tenant.findAndCountAll({ where, order: [['createdAt', 'DESC']], limit: pageSize, offset: (page - 1) * pageSize });
  const items = await Promise.all(result.rows.map(async (tenant) => { const counts = await tenantCounts(tenant.id); return tenantShape(tenant, counts.employeeCount, counts.departmentCount); }));
  return { items, pagination: { page, pageSize, total: result.count, totalPages: Math.ceil(result.count / pageSize) } };
}

export async function platformStats() {
  const [totalTenants, activeTenants, employees, planRows] = await Promise.all([Tenant.count(), Tenant.count({ where: { isActive: true } }), Employee.count({ where: { employmentStatus: { [Op.ne]: 'terminated' } } }), Tenant.findAll({ attributes: ['plan', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['plan'], raw: true })]);
  const planCounts = Object.fromEntries(planRows.map((row) => [row.plan, Number(row.count)])); const monthlyRevenue = Object.entries(planCounts).reduce((total, [plan, count]) => total + (PLAN_PRICES[plan] || 0) * count, 0);
  return { totalTenants, activeTenants, inactiveTenants: totalTenants - activeTenants, totalEmployees: employees, planCounts, simulatedMonthlyRevenue: monthlyRevenue, currency: 'USD' };
}

export async function getTenant(id) {
  const tenant = await Tenant.findByPk(id); if (!tenant) throw new AppError('Tenant not found', 404, 'TENANT_NOT_FOUND'); const counts = await tenantCounts(id); const settings = await TenantSetting.findOne({ where: { tenantId: id }, attributes: ['timezone', 'currency', 'workStartTime', 'workEndTime', 'lateThreshold'] }); return { ...tenantShape(tenant, counts.employeeCount, counts.departmentCount), settings };
}

async function setTenantStatus(id, isActive) {
  return sequelize.transaction(async (transaction) => {
    const tenant = await Tenant.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE }); if (!tenant) throw new AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
    if (tenant.isActive === isActive) throw new AppError(`Tenant is already ${isActive ? 'active' : 'inactive'}`, 409, 'TENANT_ALREADY_IN_STATE');
    tenant.isActive = isActive; await tenant.save({ fields: ['isActive'], transaction });
    if (!isActive) await UserSession.update({ revokedAt: new Date() }, { where: { tenantId: id, revokedAt: null }, transaction });
    return tenant;
  });
}

export async function deactivateTenant(id) { return setTenantStatus(id, false); }
export async function reactivateTenant(id) { return setTenantStatus(id, true); }
