import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';
import { evaluatePlayerAchievements } from '@/lib/achievements/evaluator';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'COACH' && auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const { playerId } = await req.json();
  if (!playerId) return err('playerId required', 'MISSING_FIELD', 400);

  // Coach can only evaluate players in their teams
  if (auth.role === 'COACH') {
    const teams   = await prisma.team.findMany({ where: { coachId: auth.id }, select: { id: true } });
    const teamIds = teams.map((t) => t.id);
    const player  = await prisma.player.findFirst({ where: { id: playerId, teamId: { in: teamIds } } });
    if (!player) return forbidden();
  }

  const result = await evaluatePlayerAchievements(playerId, { trigger: 'manual' });
  return ok(result);
}
