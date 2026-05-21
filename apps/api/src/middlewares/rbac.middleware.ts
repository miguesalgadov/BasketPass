import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from './auth.middleware';

// Extended role type that includes STATISTICIAN (assigned per-match, not stored in User.role)
export type ExtendedRole = UserRole | 'STATISTICIAN';

export function requireRole(...roles: ExtendedRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    if (!(roles as string[]).includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }

    next();
  };
}
