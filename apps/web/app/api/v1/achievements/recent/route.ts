import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'COACH' && auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId') ?? undefined;
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50);

  const playerIds = teamId
    ? (await prisma.player.findMany({ where: { teamId, isActive: true }, select: { id: true } })).map((p) => p.id)
    : undefined;

  const events = await prisma.achievementEvent.findMany({
    where:   {
      type:    'UNLOCKED',
      ...(playerIds && { playerId: { in: playerIds } }),
    },
    include: {
      player:      { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
      achievement: true,
    },
    orderBy: { createdAt: 'desc' },
    take:    limit,
  });

  return ok(events);
}
