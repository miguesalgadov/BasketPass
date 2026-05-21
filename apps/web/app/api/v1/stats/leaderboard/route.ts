import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const teamId = new URL(req.url).searchParams.get('teamId');

  const stats = await prisma.playerStat.groupBy({
    by: ['playerId'],
    where: { player: { user: { clubId: auth.clubId }, ...(teamId && { teamId }), isActive: true } },
    _sum: { points: true, rebounds: true, assists: true, steals: true, blocks: true },
    _avg: { points: true, rebounds: true, assists: true },
    _count: { matchId: true },
    orderBy: { _sum: { points: 'desc' } },
    take: 20,
  });

  const playerIds = stats.map((s) => s.playerId);
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } }, team: { select: { name: true } } },
  });
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  const leaderboard = stats.map((s) => ({ ...s, player: playerMap[s.playerId] }));
  return ok(leaderboard);
}
