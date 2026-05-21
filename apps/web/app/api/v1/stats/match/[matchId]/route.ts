import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { matchId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const stats = await prisma.playerStat.findMany({
    where: { matchId: params.matchId },
    include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } },
  });
  return ok(stats);
}

export async function POST(req: NextRequest, { params }: { params: { matchId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

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
  return ok(results);
}
