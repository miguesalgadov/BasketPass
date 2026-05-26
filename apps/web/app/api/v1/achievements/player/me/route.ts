import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok } from '@/lib/auth-server';
import { getPlayerLevel } from '@/lib/achievements/level';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const player = await prisma.player.findFirst({ where: { userId: auth.id } });
  if (!player) return forbidden();

  const [allAchievements, playerAchievements, unreadIds] = await Promise.all([
    prisma.achievement.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { rarity: 'asc' }] }),
    prisma.playerAchievement.findMany({
      where:   { playerId: player.id },
      include: { achievement: true },
    }),
    prisma.achievementEvent.findMany({
      where:  { playerId: player.id, type: 'UNLOCKED', readAt: null },
      select: { achievementId: true },
    }),
  ]);

  const paMap      = new Map(playerAchievements.map((pa) => [pa.achievementId, pa]));
  const unreadSet  = new Set(unreadIds.map((e) => e.achievementId));

  const merged = allAchievements.map((ach) => {
    const pa = paMap.get(ach.id);
    return {
      ...ach,
      status:       pa?.status      ?? 'LOCKED',
      progress:     pa?.progress    ?? 0,
      target:       pa?.target      ?? (ach.threshold ?? 1),
      unlockedAt:   pa?.unlockedAt  ?? null,
      coachComment: pa?.coachComment ?? null,
      season:       pa?.season      ?? null,
      seen:         pa?.status === 'UNLOCKED' && !unreadSet.has(ach.id),
    };
  });

  const unlocked = merged.filter((a) => a.status === 'UNLOCKED');
  const totalPoints = unlocked.reduce((s, a) => s + a.points, 0);
  const level = getPlayerLevel(unlocked.length);

  // Mark unread UNLOCKED events as read
  await prisma.achievementEvent.updateMany({
    where:  { playerId: player.id, type: 'UNLOCKED', readAt: null },
    data:   { readAt: new Date() },
  });

  const unreadCount = unreadSet.size;

  return ok({
    achievements: merged,
    summary: {
      unlockedCount:   unlocked.length,
      inProgressCount: merged.filter((a) => a.status === 'IN_PROGRESS').length,
      totalPoints,
      level,
      unreadEvents: unreadCount,
    },
  });
}
