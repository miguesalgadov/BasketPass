import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const sessions = await prisma.matchStatSession.findMany({
    where: { match: { championship: { clubId: auth.clubId } } },
    include: { match: { include: { championship: { select: { name: true } }, homeTeam: true, awayTeam: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return ok(sessions);
}
