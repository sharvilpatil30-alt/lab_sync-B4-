import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authenticate.js';
import { AppError } from '../utils/AppError.js';
import { Role } from '../constants/roles.js';

export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    const userRole = (req.user.role || '').toLowerCase();
    const isAllowed = allowedRoles.some((role) => {
      const canonicalAllowed = role.toLowerCase();
      if (canonicalAllowed === userRole) return true;
      if (canonicalAllowed === 'admin' && (userRole === 'lab_admin' || userRole === 'lab_assistant')) return true;
      return false;
    });

    if (!isAllowed) {
      return next(
        new AppError(
          `Access forbidden: required role [${allowedRoles.join(', ')}], but current user has role [${req.user.role}].`,
          403
        )
      );
    }

    next();
  };
}
