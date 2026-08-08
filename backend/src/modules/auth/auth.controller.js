import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.js';
import { acceptInvitation, inviteUser, login, logout, refresh, registerCompany, requestPasswordReset, resetPassword } from './auth.service.js';

function publicUser(user) {
  return { id: user.id, tenantId: user.tenantId, name: user.name, email: user.email, avatarUrl: user.avatarUrl || null, role: user.role, status: user.status };
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(env.REFRESH_COOKIE_NAME, refreshToken, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000, path: `${env.API_PREFIX}/auth` });
}

function clearRefreshCookie(res) {
  res.clearCookie(env.REFRESH_COOKIE_NAME, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', path: `${env.API_PREFIX}/auth` });
}

export async function register(req, res, next) {
  try {
    const result = await registerCompany(req.validated.body, req);
    setRefreshCookie(res, result.tokens.refreshToken);
    res.status(201).json({ success: true, data: { user: publicUser(result.user), tenant: { id: result.tenant.id, companyName: result.tenant.companyName, slug: result.tenant.slug }, accessToken: result.tokens.accessToken } });
  } catch (error) { next(error); }
}

export async function loginHandler(req, res, next) {
  try {
    const result = await login(req.validated.body, req);
    setRefreshCookie(res, result.tokens.refreshToken);
    res.json({ success: true, data: { user: publicUser(result.user), accessToken: result.tokens.accessToken } });
  } catch (error) { next(error); }
}

export async function refreshHandler(req, res, next) {
  try {
    const token = req.cookies[env.REFRESH_COOKIE_NAME];
    if (!token) throw new AppError('Refresh token required', 401, 'UNAUTHORIZED');
    const result = await refresh(token, req);
    setRefreshCookie(res, result.tokens.refreshToken);
    res.json({ success: true, data: { user: publicUser(result.user), accessToken: result.tokens.accessToken } });
  } catch (error) { clearRefreshCookie(res); next(error); }
}

export async function logoutHandler(req, res, next) {
  try { await logout(req.cookies[env.REFRESH_COOKIE_NAME]); clearRefreshCookie(res); res.status(204).send(); } catch (error) { next(error); }
}

export async function me(req, res) {
  res.json({ success: true, data: { user: publicUser(req.auth.user) } });
}

export async function forgotPassword(req, res, next) {
  try { await requestPasswordReset(req.validated.body.email); res.json({ success: true, data: { message: 'If an account exists for that email, a reset link has been sent.' } }); } catch (error) { next(error); }
}

export async function resetPasswordHandler(req, res, next) {
  try { await resetPassword(req.validated.body); res.json({ success: true, data: { message: 'Password reset successfully. Please sign in again.' } }); } catch (error) { next(error); }
}

export async function inviteHandler(req, res, next) {
  try { const invitation = await inviteUser(req.validated.body, req.auth, req); res.status(201).json({ success: true, data: { id: invitation.id, email: invitation.email, expiresAt: invitation.expiresAt } }); } catch (error) { next(error); }
}

export async function acceptInvitationHandler(req, res, next) {
  try { const user = await acceptInvitation(req.validated.body); res.status(201).json({ success: true, data: { user: publicUser(user), message: 'Account activated. You can now sign in.' } }); } catch (error) { next(error); }
}
