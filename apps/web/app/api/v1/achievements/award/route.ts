import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';
import { emitCoachAwarded } from '@/lib/achievements/events';

// Achievements that COACH (not admin) can assign
const COACH_ALLOWED = ['Candado Defensivo', 'Reconocimiento del Coach', 'Actitud Ganadora', 'Progreso Notable'];
// MVP requires CLUB_ADMIN or SUPER_ADMIN
const ADMIN_ONLY    = ['MVP de Temporada'];

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'COACH' && auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const { playerId, achievementId, comment } = await req.json();
  if (!playerId || !achievementId) return err('playerId and achievementId required', 'MISSING_FIELDS', 400);

  // Prevent self-award
  const selfPlayer = await prisma.player.findFirst({ where: { userId: auth.id } });
  if (selfPlayer?.id === playerId) return err('No puedes asignarte un logro a ti mismo', 'SELF_AWARD', 403);

  const achievement = await prisma.achievement.findUnique({ where: { id: achievementId } });
  if (!achievement) return err('Achievement not found', 'NOT_FOUND', 404);
  if (!achievement.isActive) return err('Esta insignia está inactiva', 'INACTIVE', 400);
  if (achievement.triggerType !== 'MANUAL') return err('Solo se pueden asignar reconocimientos manuales', 'NOT_MANUAL', 400);

  // Permission per achievement
  if (auth.role === 'COACH') {
    if (!COACH_ALLOWED.includes(achievement.name)) return forbidden();
    // Coach can only award players in their teams
    const teams   = await prisma.team.findMany({ where: { coachId: auth.id }, select: { id: true } });
    const teamIds = teams.map((t) => t.id);
    const player  = await prisma.player.findFirst({ where: { id: playerId, teamId: { in: teamIds } } });
    if (!player) return forbidden();
  }

  if (ADMIN_ONLY.includes(achievement.name) && auth.role === 'COACH') return forbidden();

  // Comment length
  if (comment && comment.length > 250) return err('El comentario no puede superar 250 caracteres', 'COMMENT_TOO_LONG', 400);

  // Find existing PlayerAchievement (can't use findUnique — unique key includes nullable seasonId)
  const existing = await prisma.playerAchievement.findFirst({
    where: { playerId, achievementId },
  });

  if (existing?.status === 'UNLOCKED') return err('Este jugador ya tiene esta insignia', 'ALREADY_UNLOCKED', 400);

  const paData = { status: 'UNLOCKED' as const, unlockedAt: new Date(), awardedByCoachId: auth.id, coachComment: comment ?? null, progress: 1, target: 1 };
  const include = { achievement: true, player: { include: { user: true } } } as const;

  const pa = existing
    ? await prisma.playerAchievement.update({ where: { id: existing.id }, data: paData, include })
    : await prisma.playerAchievement.create({ data: { playerId, achievementId, ...paData }, include });

  // Emit event
  const coach    = await prisma.user.findUnique({ where: { id: auth.id }, select: { firstName: true, lastName: true } });
  const coachName = coach ? `${coach.firstName} ${coach.lastName}` : 'Tu coach';
  const playerName = `${pa.player.user.firstName} ${pa.player.user.lastName}`;

  await emitCoachAwarded(playerId, achievementId, achievement.name, playerName, coachName);

  return ok(pa);
}
