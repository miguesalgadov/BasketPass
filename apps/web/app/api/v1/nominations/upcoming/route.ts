import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const matches = await prisma.match.findMany({
    where: { team: { clubId: auth.clubId }, date: { gte: new Date() }, status: 'SCHEDULED' },
    include: { team: true, nominations: { include: { players: { include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } } } } } },
    orderBy: { date: 'asc' },
    take: 10,
  });
  return ok(matches);
}
