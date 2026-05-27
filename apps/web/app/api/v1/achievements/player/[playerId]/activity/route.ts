import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { playerId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { playerId } = params;
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(parseInt(searchParams.get('limit')  ?? '10'), 50);
  const cursor = searchParams.get('cursor');

  if (auth.role === 'PLAYER') {
    const self = await prisma.player.findFirst({ where: { userId: auth.id } });
    if (!self || self.id !== playerId) return forbidden();
  } else if (auth.role === 'COACH') {
    const teams = await prisma.team.findMany({ where: { coachId: auth.id }, select: { id: true } });
    const teamIds = teams.map((t) => t.id);
    const player = await prisma.player.findFirst({ where: { id: playerId, teamId: { in: teamIds } } });
    if (!player) return forbidden();
  } else if (auth.role === 'CLUB_ADMIN') {
    const player = await prisma.player.findFirst({ where: { id: playerId }, include: { user: true } });
    if (!player || player.user.clubId !== auth.clubId) return forbidden();
  }

  const events = await prisma.achievementEvent.findMany({
    where:   { playerId, ...(cursor ? { id: { lt: cursor } } : {}) },
    include: { achievement: { select: { name: true, icon: true, category: true, rarity: true } } },
    orderBy: { createdAt: 'desc' },
    take:    limit + 1,
  });

  const hasMore  = events.length > limit;
  const items    = hasMore ? events.slice(0, limit) : events;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return ok({ items, nextCursor, hasMore });
}
