import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  try {
    const result = await prisma.team.updateMany({
      where: { category: 'Mayores' },
      data:  { category: 'Senior' },
    });
    return ok({ updated: result.count });
  } catch (e: any) {
    return err(e.message, 'MIGRATION_ERROR', 500);
  }
}
