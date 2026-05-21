import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const coaches = await prisma.user.findMany({
    where: { clubId: auth.clubId, role: { in: ['COACH', 'CLUB_ADMIN'] }, isActive: true },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    orderBy: { lastName: 'asc' },
  });
  return ok(coaches);
}
