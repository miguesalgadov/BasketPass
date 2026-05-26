import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok } from '@/lib/auth-server';
import { getPlayerLevel } from '@/lib/achievements/level';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'COACH' && auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId') ?? undefined;

  const players = await prisma.player.findMany({
    where:   { isActive: true, ...(teamId && { teamId }), user: { clubId: auth.clubId } },
    include: {
      user:         { select: { firstName: true, lastName: true, avatarUrl: true } },
      achievements: {
        where:   { status: 'UNLOCKED' },
        include: { achievement: { select: { points: true } } },
      },
    },
  });

  const ranked = players
    .map((p) => {
      const unlocked = p.achievements.length;
      const points   = p.achievements.reduce((s, a) => s + a.achievement.points, 0);
      return {
        playerId:  p.id,
        firstName: p.user.firstName,
        lastName:  p.user.lastName,
        avatarUrl: p.user.avatarUrl,
        unlocked,
        points,
        level:     getPlayerLevel(unlocked),
      };
    })
    .sort((a, b) => b.points - a.points || b.unlocked - a.unlocked);

  return ok(ranked);
}
