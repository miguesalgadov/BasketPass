import { prisma } from '@/lib/prisma';

const RARITY_ORDER: Record<string, number> = { LEGENDARY: 4, EPIC: 3, RARE: 2, COMMON: 1 };

export async function getFeaturedAchievement(playerId: string) {
  const [allAchievements, playerAchievements] = await Promise.all([
    prisma.achievement.findMany({ where: { isActive: true } }),
    prisma.playerAchievement.findMany({ where: { playerId } }),
  ]);

  const paMap = new Map(playerAchievements.map((pa) => [pa.achievementId, pa]));

  const merged = allAchievements.map((ach) => {
    const pa = paMap.get(ach.id);
    return {
      ...ach,
      status:      pa?.status      ?? 'LOCKED',
      progress:    pa?.progress    ?? 0,
      target:      pa?.target      ?? (ach.threshold ?? 1),
      unlockedAt:  pa?.unlockedAt  ?? null,
      coachComment: pa?.coachComment ?? null,
    };
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 1. UNLOCKED in last 7 days, highest rarity
  const recentUnlocked = merged
    .filter((a) => a.status === 'UNLOCKED' && a.unlockedAt && new Date(a.unlockedAt) >= sevenDaysAgo)
    .sort((a, b) => (RARITY_ORDER[b.rarity] ?? 1) - (RARITY_ORDER[a.rarity] ?? 1));

  if (recentUnlocked.length > 0) return recentUnlocked[0];

  // 2. IN_PROGRESS with highest % (>= 50%)
  const inProgress = merged.filter((a) => a.status === 'IN_PROGRESS' && a.target > 0);
  const highPct = inProgress
    .filter((a) => a.progress / a.target >= 0.5)
    .sort((a, b) => b.progress / b.target - a.progress / a.target);

  if (highPct.length > 0) return highPct[0];

  // 3. IN_PROGRESS with highest rarity
  const byRarity = inProgress
    .sort((a, b) => (RARITY_ORDER[b.rarity] ?? 1) - (RARITY_ORDER[a.rarity] ?? 1));

  if (byRarity.length > 0) return byRarity[0];

  // Fallback: most recently unlocked
  const anyUnlocked = merged
    .filter((a) => a.status === 'UNLOCKED')
    .sort((a, b) => new Date(b.unlockedAt ?? 0).getTime() - new Date(a.unlockedAt ?? 0).getTime());

  return anyUnlocked[0] ?? null;
}
