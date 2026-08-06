import { AppError } from './error.js';

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    if (!allowedRoles.includes(req.auth.role)) return next(new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN'));
    next();
  };
}
