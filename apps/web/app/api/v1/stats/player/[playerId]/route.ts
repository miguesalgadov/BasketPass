import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { playerId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const stats = await prisma.playerStat.findMany({
    where: { playerId: params.playerId, player: { user: { clubId: auth.clubId } } },
    include: { match: { select: { date: true, opponent: true, isHome: true, scoreHome: true, scoreAway: true } } },
    orderBy: { match: { date: 'desc' } },
  });
  return ok(stats);
}
