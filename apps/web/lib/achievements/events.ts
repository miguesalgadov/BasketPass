import { prisma } from '@/lib/prisma';

export async function emitAchievementUnlocked(
  playerId: string,
  achievementId: string,
  achievementName: string,
  playerName: string,
) {
  await prisma.achievementEvent.create({
    data: {
      playerId,
      achievementId,
      type: 'UNLOCKED',
      message: `🏅 ¡Nuevo logro desbloqueado! ${playerName} obtuvo la insignia "${achievementName}".`,
    },
  });
}

export async function emitAchievementProgress(
  playerId: string,
  achievementId: string,
  achievementName: string,
  progress: number,
  target: number,
) {
  await prisma.achievementEvent.create({
    data: {
      playerId,
      achievementId,
      type: 'PROGRESS',
      message: `📈 Progreso en "${achievementName}": ${progress} / ${target}.`,
    },
  });
}

export async function emitCoachAwarded(
  playerId: string,
  achievementId: string,
  achievementName: string,
  playerName: string,
  coachName: string,
) {
  await prisma.achievementEvent.create({
    data: {
      playerId,
      achievementId,
      type: 'COACH_AWARDED',
      message: `🥇 ${coachName} te otorgó la insignia "${achievementName}".`,
    },
  });
  // Also notify the player via the in-app Notification model
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { userId: true } });
  if (player) {
    await prisma.notification.create({
      data: {
        userId:  player.userId,
        title:   'Nuevo reconocimiento recibido',
        body:    `${coachName} te otorgó la insignia "${achievementName}".`,
        type:    'COACH_AWARDED',
      },
    }).catch(() => {});
  }
}
