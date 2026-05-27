import { prisma } from '@/lib/prisma';
import { RULES } from './rules';
import { emitAchievementUnlocked, emitAchievementProgress } from './events';

export interface EvaluationResult {
  evaluated: number;
  unlocked: string[];
  progressed: string[];
}

/**
 * Evalúa todos los logros automáticos de un jugador y actualiza
 * sus PlayerAchievement (status, progress). Idempotente.
 */
export async function evaluatePlayerAchievements(
  playerId: string,
  context?: { trigger: 'stats' | 'attendance' | 'profile' | 'manual' },
): Promise<EvaluationResult> {
  const result: EvaluationResult = { evaluated: 0, unlocked: [], progressed: [] };

  // Fetch player name for events
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { user: { select: { firstName: true, lastName: true } } },
  });
  if (!player) return result;
  const playerName = `${player.user.firstName} ${player.user.lastName}`;

  // Only evaluate automatic achievements that are active
  const achievements = await prisma.achievement.findMany({
    where: { triggerType: 'AUTOMATIC', isActive: true, metric: { not: null } },
  });

  for (const ach of achievements) {
    if (!ach.metric || ach.threshold == null) continue;
    result.evaluated++;

    const ruleFn = RULES[ach.metric];
    if (!ruleFn) continue;

    // Get or create PlayerAchievement
    let pa = await prisma.playerAchievement.findFirst({
      where: { playerId, achievementId: ach.id },
    });

    // Already unlocked — skip
    if (pa?.status === 'UNLOCKED') continue;

    let currentValue = 0;
    try { currentValue = await ruleFn(playerId); } catch { continue; }

    const progress = Math.min(currentValue, ach.threshold);
    const isUnlocked = currentValue >= ach.threshold;

    if (!pa) {
      pa = await prisma.playerAchievement.create({
        data: {
          playerId,
          achievementId: ach.id,
          status:   isUnlocked ? 'UNLOCKED' : currentValue > 0 ? 'IN_PROGRESS' : 'LOCKED',
          progress,
          target:   ach.threshold,
          unlockedAt: isUnlocked ? new Date() : null,
        },
      });
      if (isUnlocked) {
        await emitAchievementUnlocked(playerId, ach.id, ach.name, playerName);
        result.unlocked.push(ach.name);
      }
    } else {
      const newStatus = isUnlocked ? 'UNLOCKED' : currentValue > 0 ? 'IN_PROGRESS' : 'LOCKED';
      const wasInProgress = pa.status === 'IN_PROGRESS';
      const progressChanged = pa.progress !== progress;

      await prisma.playerAchievement.update({
        where: { id: pa.id },
        data: {
          status:    newStatus,
          progress,
          target:    ach.threshold,
          unlockedAt: isUnlocked ? (pa.unlockedAt ?? new Date()) : null,
        },
      });

      if (isUnlocked) {
        await emitAchievementUnlocked(playerId, ach.id, ach.name, playerName);
        result.unlocked.push(ach.name);
      } else if (wasInProgress && progressChanged) {
        await emitAchievementProgress(playerId, ach.id, ach.name, progress, ach.threshold);
        result.progressed.push(ach.name);
      }
    }
  }

  return result;
}
