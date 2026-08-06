import { Tenant, User } from '../database/models/index.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { AppError } from './error.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.get('authorization');
    if (!header?.startsWith('Bearer ')) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');

    const payload = verifyAccessToken(header.slice(7));
    const user = await User.findByPk(Number(payload.sub));
    if (!user || user.status !== 'active') throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    if (user.tenantId && payload.tenantId !== user.tenantId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    if (user.tenantId) {
      const tenant = await Tenant.findByPk(user.tenantId);
      if (!tenant?.isActive) throw new AppError('This workspace is inactive', 403, 'TENANT_INACTIVE');
    }

    req.auth = { userId: user.id, tenantId: user.tenantId, role: user.role, user };
    req.tenantId = user.tenantId;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired access token', 401, 'UNAUTHORIZED'));
    }
    next(error);
  }
}
