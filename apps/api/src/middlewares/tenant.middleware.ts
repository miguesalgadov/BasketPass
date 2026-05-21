import { Response, NextFunction } from 'express';
import { prisma } from '@/config/database';
import { AuthenticatedRequest } from './auth.middleware';

export async function resolveTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const clubIdHeader = req.headers['x-club-id'] as string;
  const host = req.headers.host || '';
  const subdomain = host.split('.')[0];

  if (req.user?.clubId) {
    return next();
  }

  const identifier = clubIdHeader || subdomain;
  if (!identifier) {
    return res.status(400).json({
      success: false,
      error: { code: 'TENANT_NOT_FOUND', message: 'Club identifier required' },
    });
  }

  try {
    const club = await prisma.club.findFirst({
      where: { OR: [{ id: identifier }, { slug: identifier }], isActive: true },
    });

    if (!club) {
      return res.status(404).json({
        success: false,
        error: { code: 'CLUB_NOT_FOUND', message: 'Club not found' },
      });
    }

    (req as any).club = club;
    next();
  } catch {
    next();
  }
}
