import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { env } from '../../config/env.js';
import { sequelize } from '../../config/database.js';
import { Department, Employee, Invitation, LeaveType, PasswordResetToken, Tenant, TenantSetting, User, UserSession } from '../../database/models/index.js';
import { AppError } from '../../middleware/error.js';
import { sendInvitationEmail, sendPasswordResetEmail } from '../../services/email.service.js';
import { hashToken, parseDuration, randomToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/tokens.js';

const SALT_ROUNDS = 12;

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 170) || 'workspace';
}

async function uniqueSlug(companyName, transaction) {
  const base = slugify(companyName);
  let slug = base;
  let suffix = 2;
  while (await Tenant.findOne({ where: { slug }, transaction })) slug = `${base}-${suffix++}`;
  return slug;
}

function sessionMetadata(req) {
  return { userAgent: req.get('user-agent')?.slice(0, 500), ipAddress: req.ip };
}

async function issueSession(user, req, transaction) {
  const sessionId = crypto.randomUUID();
  const refreshToken = signRefreshToken(user, sessionId);
  await UserSession.create({ id: sessionId, userId: user.id, tenantId: user.tenantId, refreshTokenHash: hashToken(refreshToken), expiresAt: new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN)), ...sessionMetadata(req) }, { transaction });
  return { accessToken: signAccessToken(user), refreshToken };
}

export async function registerCompany(input, req) {
  return sequelize.transaction(async (transaction) => {
    const existing = await User.findOne({ where: { email: input.adminEmail }, transaction });
    if (existing) throw new AppError('Unable to create workspace with those details', 409, 'EMAIL_IN_USE');
    const tenant = await Tenant.create({ companyName: input.companyName, slug: await uniqueSlug(input.companyName, transaction), industry: input.industry, companySize: input.companySize }, { transaction });
    await TenantSetting.create({ tenantId: tenant.id }, { transaction });
    await LeaveType.bulkCreate([
      { tenantId: tenant.id, name: 'Annual Leave', code: 'annual', isPaid: true, annualAllowance: 20, requiresApproval: true, isActive: true },
      { tenantId: tenant.id, name: 'Sick Leave', code: 'sick', isPaid: true, annualAllowance: 10, requiresApproval: true, isActive: true },
      { tenantId: tenant.id, name: 'Casual Leave', code: 'casual', isPaid: true, annualAllowance: 6, requiresApproval: true, isActive: true },
      { tenantId: tenant.id, name: 'Unpaid Leave', code: 'unpaid', isPaid: false, annualAllowance: 365, requiresApproval: true, isActive: true }
    ], { transaction });
    const user = await User.create({ tenantId: tenant.id, name: input.adminName, email: input.adminEmail, passwordHash: await bcrypt.hash(input.password, SALT_ROUNDS), role: 'admin', status: 'active', emailVerifiedAt: new Date() }, { transaction });
    return { tenant, user, tokens: await issueSession(user, req, transaction) };
  });
}

export async function login(input, req) {
  const user = await User.findOne({ where: { email: input.email } });
  if (!user || user.status !== 'active' || !(await bcrypt.compare(input.password, user.passwordHash))) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  if (user.tenantId) {
    const tenant = await Tenant.findByPk(user.tenantId);
    if (!tenant?.isActive) throw new AppError('This workspace is inactive', 403, 'TENANT_INACTIVE');
  }
  user.lastLoginAt = new Date();
  await user.save({ fields: ['lastLoginAt'] });
  return { user, tokens: await issueSession(user, req) };
}

export async function refresh(refreshToken, req) {
  let payload;
  try { payload = verifyRefreshToken(refreshToken); } catch { throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED'); }
  if (payload.tokenType !== 'refresh') throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');
  const session = await UserSession.findOne({ where: { id: payload.sessionId, refreshTokenHash: hashToken(refreshToken), revokedAt: null, expiresAt: { [Op.gt]: new Date() } } });
  if (!session) throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');
  const user = await User.findByPk(Number(payload.sub));
  if (!user || user.status !== 'active') throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');
  const nextRefreshToken = signRefreshToken(user, session.id);
  session.refreshTokenHash = hashToken(nextRefreshToken); session.lastUsedAt = new Date(); session.expiresAt = new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN));
  await session.save({ fields: ['refreshTokenHash', 'lastUsedAt', 'expiresAt'] });
  return { user, tokens: { accessToken: signAccessToken(user), refreshToken: nextRefreshToken } };
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  await UserSession.update({ revokedAt: new Date() }, { where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null } });
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ where: { email } });
  if (!user || user.status !== 'active') return;
  const rawToken = randomToken();
  await PasswordResetToken.update({ usedAt: new Date() }, { where: { userId: user.id, usedAt: null } });
  await PasswordResetToken.create({ userId: user.id, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + env.RESET_TOKEN_EXPIRES_MINUTES * 60_000) });
  await sendPasswordResetEmail({ email: user.email, resetUrl: `${env.CLIENT_URL}/reset-password?token=${rawToken}` });
}

export async function resetPassword({ token, password }) {
  const reset = await PasswordResetToken.findOne({ where: { tokenHash: hashToken(token), usedAt: null, expiresAt: { [Op.gt]: new Date() } } });
  if (!reset) throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
  await sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(reset.userId, { transaction, lock: transaction.LOCK.UPDATE });
    user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS); await user.save({ fields: ['passwordHash'], transaction });
    reset.usedAt = new Date(); await reset.save({ fields: ['usedAt'], transaction });
    await UserSession.update({ revokedAt: new Date() }, { where: { userId: user.id, revokedAt: null }, transaction });
  });
}

export async function inviteUser(input, auth, req) {
  if (input.departmentId && !await Department.findOne({ where: { id: input.departmentId, tenantId: auth.tenantId } })) throw new AppError('Department does not belong to this workspace', 422, 'INVALID_DEPARTMENT');
  const tenant = await Tenant.findByPk(auth.tenantId);
  const activeEmployeeCount = await Employee.count({ where: { tenantId: auth.tenantId, employmentStatus: { [Op.ne]: 'terminated' } } });
  if (activeEmployeeCount >= tenant.employeeLimit) throw new AppError(`Your ${tenant.plan} plan allows up to ${tenant.employeeLimit} active employees`, 409, 'EMPLOYEE_LIMIT_REACHED');
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) throw new AppError('A user with this email already exists', 409, 'EMAIL_IN_USE');
  const rawToken = randomToken();
  const invitation = await Invitation.create({ tenantId: auth.tenantId, email: input.email, name: input.name, role: input.role, departmentId: input.departmentId ?? null, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + env.INVITE_TOKEN_EXPIRES_HOURS * 3_600_000), invitedBy: auth.userId });
  await sendInvitationEmail({ email: input.email, inviteUrl: `${env.CLIENT_URL}/set-password?token=${rawToken}` });
  return invitation;
}

export async function acceptInvitation({ token, name, password }) {
  const invitation = await Invitation.findOne({ where: { tokenHash: hashToken(token), acceptedAt: null, expiresAt: { [Op.gt]: new Date() } } });
  if (!invitation) throw new AppError('Invalid or expired invitation', 400, 'INVALID_INVITATION');
  const existing = await User.findOne({ where: { email: invitation.email } });
  if (existing) throw new AppError('A user with this email already exists', 409, 'EMAIL_IN_USE');
  return sequelize.transaction(async (transaction) => {
    const tenant = await Tenant.findByPk(invitation.tenantId, { transaction, lock: transaction.LOCK.UPDATE });
    const activeEmployeeCount = await Employee.count({ where: { tenantId: invitation.tenantId, employmentStatus: { [Op.ne]: 'terminated' } }, transaction });
    if (activeEmployeeCount >= tenant.employeeLimit) throw new AppError(`Your ${tenant.plan} plan allows up to ${tenant.employeeLimit} active employees`, 409, 'EMPLOYEE_LIMIT_REACHED');
    if (invitation.departmentId && !await Department.findOne({ where: { id: invitation.departmentId, tenantId: invitation.tenantId }, transaction })) throw new AppError('Invitation department is no longer available', 409, 'INVALID_DEPARTMENT');
    const user = await User.create({ tenantId: invitation.tenantId, name: name || invitation.name, email: invitation.email, passwordHash: await bcrypt.hash(password, SALT_ROUNDS), role: invitation.role, status: 'active', emailVerifiedAt: new Date() }, { transaction });
    const prefix = tenant.companyName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'EMP';
    const lastEmployee = await Employee.findOne({ where: { tenantId: invitation.tenantId }, order: [['id', 'DESC']], transaction, lock: transaction.LOCK.UPDATE });
    const sequence = lastEmployee?.employeeCode?.match(/(\d+)$/)?.[1];
    await Employee.create({ tenantId: invitation.tenantId, userId: user.id, departmentId: invitation.departmentId, employeeCode: `${prefix}-${String(Number(sequence || 0) + 1).padStart(4, '0')}`, joiningDate: new Date(), employmentType: 'full-time', employmentStatus: 'active' }, { transaction });
    invitation.acceptedAt = new Date(); await invitation.save({ fields: ['acceptedAt'], transaction });
    return user;
  });
}
