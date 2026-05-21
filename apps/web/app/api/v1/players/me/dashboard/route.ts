import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const player = await prisma.player.findFirst({
    where: { userId: auth.id },
    include: { team: true },
  });
  if (!player) return ok({ player: null, upcomingMatches: [], recentStats: [], pendingFees: [] });

  const [upcomingMatches, recentStats, pendingFees] = await Promise.all([
    prisma.match.findMany({
      where: { teamId: player.teamId ?? undefined, date: { gte: new Date() }, status: 'SCHEDULED' },
      orderBy: { date: 'asc' }, take: 3,
    }),
    prisma.playerStat.findMany({
      where: { playerId: player.id },
      include: { match: true },
      orderBy: { match: { date: 'desc' } }, take: 5,
    }),
    prisma.fee.findMany({
      where: { playerId: player.id, status: { in: ['PENDING', 'OVERDUE'] } },
      include: { feeType: true }, orderBy: { dueDate: 'asc' }, take: 3,
    }),
  ]);

  return ok({ player, upcomingMatches, recentStats, pendingFees });
}
