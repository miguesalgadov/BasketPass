import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok } from '@/lib/auth-server';
import { getPlayerLevel } from '@/lib/achievements/level';

export async function GET(req: NextRequest, { params }: { params: { playerId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const playerId = params.playerId;

  // Permission check:
  // PLAYER → only own data
  // COACH  → players of their teams
  // CLUB_ADMIN / SUPER_ADMIN → any player of their club
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

  // Fetch all active achievements and player's progress
  const [allAchievements, playerAchievements, unreadEvents] = await Promise.all([
    prisma.achievement.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { rarity: 'asc' }] }),
    prisma.playerAchievement.findMany({
      where:   { playerId },
      include: { achievement: true },
    }),
    prisma.achievementEvent.count({
      where: { playerId, readAt: null, type: 'UNLOCKED' },
    }),
  ]);

  // Merge: every achievement gets a status row (LOCKED by default if not started)
  const paMap = new Map(playerAchievements.map((pa) => [pa.achievementId, pa]));

  const merged = allAchievements.map((ach) => {
    const pa = paMap.get(ach.id);
    return {
      ...ach,
      status:    pa?.status    ?? 'LOCKED',
      progress:  pa?.progress  ?? 0,
      target:    pa?.target    ?? (ach.threshold ?? 1),
      unlockedAt: pa?.unlockedAt ?? null,
      coachComment: pa?.coachComment ?? null,
      season:    pa?.season    ?? null,
    };
  });

  const unlocked = merged.filter((a) => a.status === 'UNLOCKED');
  const totalPoints = unlocked.reduce((s, a) => s + a.points, 0);
  const level = getPlayerLevel(unlocked.length);

  return ok({
    achievements: merged,
    summary: {
      unlockedCount:   unlocked.length,
      inProgressCount: merged.filter((a) => a.status === 'IN_PROGRESS').length,
      totalPoints,
      level,
      unreadEvents,
    },
  });
}
