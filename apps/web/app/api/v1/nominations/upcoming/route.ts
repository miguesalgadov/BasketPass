import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const matches = await prisma.match.findMany({
    where: { team: { clubId: auth.clubId }, date: { gte: new Date() }, status: 'SCHEDULED' },
    include: {
      team: true,
      nominations: { include: { players: true } },
    },
    orderBy: { date: 'asc' },
    take: 10,
  });

  const result = matches.map((m) => {
    const nom = m.nominations.find((n) => n.teamId === m.teamId) ?? null;
    return {
      id: m.id,
      scheduledAt: m.date.toISOString(),
      venue: m.location ?? null,
      championship: null,
      homeTeam: m.isHome ? m.team.name : m.opponent,
      awayTeam: m.isHome ? m.opponent : m.team.name,
      side: m.isHome ? 'home' : 'away',
      coachTeamId: m.teamId,
      nomination: nom
        ? {
            id: nom.id,
            playerCount: nom.players.length,
            notes: nom.notes ?? null,
            jerseyColor: nom.jerseyColor ?? null,
            sockColor: nom.sockColor ?? null,
            whatsappSentAt: nom.whatsappSentAt?.toISOString() ?? null,
          }
        : null,
    };
  });

  return ok(result);
}
