import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok } from '@/lib/auth-server';
import { getFeaturedAchievement } from '@/lib/achievements/featured';

export async function GET(req: NextRequest, { params }: { params: { playerId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { playerId } = params;

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

  const featured = await getFeaturedAchievement(playerId);
  return ok({ featured });
}
