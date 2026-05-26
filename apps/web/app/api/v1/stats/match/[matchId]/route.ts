import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';
import { evaluatePlayerAchievements } from '@/lib/achievements/evaluator';

export async function GET(req: NextRequest, { params }: { params: { matchId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const stats = await prisma.playerStat.findMany({
    where: { matchId: params.matchId, match: { team: { clubId: auth.clubId } } },
    include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } },
  });
  return ok(stats);
}

export async function POST(req: NextRequest, { params }: { params: { matchId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const match = await prisma.match.findFirst({ where: { id: params.matchId, team: { clubId: auth.clubId } } });
  if (!match) return err('Match not found', 'NOT_FOUND', 404);

  const stats = await req.json();
  const results = await prisma.$transaction(
    stats.map((s: any) =>
      prisma.playerStat.upsert({
        where: { playerId_matchId: { playerId: s.playerId, matchId: params.matchId } },
        update: { ...s, matchId: undefined },
        create: { ...s, matchId: params.matchId },
      })
    )
  );

  // Fire-and-forget achievement evaluation for each player
  const playerIds: string[] = Array.from(new Set<string>(stats.map((s: any) => String(s.playerId))));
  void Promise.allSettled(playerIds.map((id) => evaluatePlayerAchievements(id)));

  return ok(results);
}
