import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok } from '@/lib/auth-server';
import { getPlayerLevel, getNextLevel, getProgressToNextLevel } from '@/lib/achievements/level';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const player = await prisma.player.findFirst({
    where: { userId: auth.id },
    include: {
      user: { include: { club: true } },
      team: true,
    },
  });
  if (!player) return forbidden();

  const [allAchievements, playerAchievements, unreadIds] = await Promise.all([
    prisma.achievement.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { rarity: 'asc' }] }),
    prisma.playerAchievement.findMany({ where: { playerId: player.id } }),
    prisma.achievementEvent.findMany({
      where:  { playerId: player.id, type: 'UNLOCKED', readAt: null },
      select: { achievementId: true },
    }),
  ]);

  const paMap     = new Map(playerAchievements.map((pa) => [pa.achievementId, pa]));
  const unreadSet = new Set(unreadIds.map((e) => e.achievementId));

  const merged = allAchievements.map((ach) => {
    const pa = paMap.get(ach.id);
    return {
      ...ach,
      status:       pa?.status      ?? 'LOCKED',
      progress:     pa?.progress    ?? 0,
      target:       pa?.target      ?? (ach.threshold ?? 1),
      unlockedAt:   pa?.unlockedAt  ?? null,
      coachComment: pa?.coachComment ?? null,
      season:       null,
      seen:         pa?.status === 'UNLOCKED' && !unreadSet.has(ach.id),
    };
  });

  const unlocked    = merged.filter((a) => a.status === 'UNLOCKED');
  const totalPoints = unlocked.reduce((s, a) => s + a.points, 0);
  const level       = getPlayerLevel(unlocked.length);
  const nextLevel   = getNextLevel(level.id);

  await prisma.achievementEvent.updateMany({
    where: { playerId: player.id, type: 'UNLOCKED', readAt: null },
    data:  { readAt: new Date() },
  });

  return ok({
    player: {
      id:           player.id,
      firstName:    player.user.firstName,
      lastName:     player.user.lastName,
      avatarUrl:    player.user.avatarUrl,
      jerseyNumber: player.jerseyNumber,
      position:     player.position,
      isActive:     player.isActive,
      team:  player.team  ? { name: player.team.name, category: player.team.category } : null,
      club:  player.user.club ? { name: player.user.club.name, logo: player.user.club.logo } : null,
    },
    achievements: merged,
    summary: {
      unlockedCount:   unlocked.length,
      inProgressCount: merged.filter((a) => a.status === 'IN_PROGRESS').length,
      totalPoints,
      level,
      nextLevel:       nextLevel ?? null,
      progressToNext:  getProgressToNextLevel(unlocked.length),
      unreadEvents:    unreadSet.size,
    },
  });
}
