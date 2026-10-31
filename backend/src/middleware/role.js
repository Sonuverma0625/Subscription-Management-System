import { ApiError } from '../utils/apiError.js';

export function requireRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Sign in to continue.'));
    if (!allowedRoles.includes(req.user.role)) return next(new ApiError(403, 'You do not have permission to perform this action.'));
    return next();
  };
}

export const requireAdmin = requireRoles('ADMIN');
export const requireInternalUser = requireRoles('ADMIN', 'STAFF');
