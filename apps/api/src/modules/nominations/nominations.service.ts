import { prisma } from '@/config/database';

const MAX_PLAYERS = 12;
const UPCOMING_DAYS = 7;

function err(msg: string, code = 400): Error {
  const e = new Error(msg);
  (e as any).statusCode = code;
  return e;
}

export const nominationsService = {
  // Returns upcoming matches (next N days) for teams coached by this user
  async getUpcomingMatches(coachId: string) {
    const coach = await prisma.user.findUnique({
      where: { id: coachId },
      include: { coachedTeams: { select: { id: true, name: true } } },
    });
    if (!coach) throw err('Coach not found', 404);

    const teamIds = coach.coachedTeams.map((t) => t.id);
    if (teamIds.length === 0) return [];

    const now = new Date();
    const cutoff = new Date(now.getTime() + UPCOMING_DAYS * 24 * 60 * 60 * 1000);

    const matches = await prisma.match.findMany({
      where: {
        teamId: { in: teamIds },
        date: { gte: now, lte: cutoff },
        status: { in: ['SCHEDULED', 'LIVE'] },
      },
      include: {
        team: { select: { id: true, name: true } },
        nominations: {
          include: { players: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    return matches.map((m) => {
      const nomination = m.nominations[0] ?? null;
      return {
        id: m.id,
        scheduledAt: m.date.toISOString(),
        venue: m.location,
        championship: m.team.name,
        homeTeam: m.isHome ? m.team.name : m.opponent,
        awayTeam: m.isHome ? m.opponent : m.team.name,
        side: m.isHome ? 'home' : 'away',
        coachTeamId: m.teamId,
        nomination: nomination
          ? {
              id: nomination.id,
              playerCount: nomination.players.length,
              notes: nomination.notes,
              jerseyColor: nomination.jerseyColor,
              sockColor: nomination.sockColor,
              whatsappSentAt: nomination.whatsappSentAt,
            }
          : null,
      };
    });
  },

  async getNomination(matchId: string, teamId: string) {
    const nomination = await prisma.matchNomination.findUnique({
      where: { matchId_teamId: { matchId, teamId } },
      include: {
        players: {
          include: {
            player: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, phone: true } },
              },
            },
          },
        },
      },
    });

    if (!nomination) return null;

    return {
      id: nomination.id,
      notes: nomination.notes,
      jerseyColor: nomination.jerseyColor,
      sockColor: nomination.sockColor,
      whatsappSentAt: nomination.whatsappSentAt,
      players: nomination.players.map((np) => ({
        id: np.player.id,
        name: `${np.player.user.firstName} ${np.player.user.lastName}`,
        number: np.player.jerseyNumber,
        position: np.player.position,
        phone: np.player.user.phone,
      })),
    };
  },

  async upsertNomination(
    matchId: string,
    teamId: string,
    coachId: string,
    playerIds: string[],
    notes?: string,
    jerseyColor?: string,
    sockColor?: string,
  ) {
    if (playerIds.length > MAX_PLAYERS) {
      throw err(`Máximo ${MAX_PLAYERS} jugadores por nómina`);
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw err('Partido no encontrado', 404);

    const nomination = await prisma.matchNomination.upsert({
      where: { matchId_teamId: { matchId, teamId } },
      create: { matchId, teamId, coachId, notes, jerseyColor, sockColor },
      update: { notes, coachId, jerseyColor, sockColor },
    });

    await prisma.matchNominationPlayer.deleteMany({ where: { nominationId: nomination.id } });
    if (playerIds.length > 0) {
      await prisma.matchNominationPlayer.createMany({
        data: playerIds.map((playerId) => ({ nominationId: nomination.id, playerId })),
      });
    }

    return nominationsService.getNomination(matchId, teamId);
  },

  async markWhatsappSent(matchId: string, teamId: string) {
    const nomination = await prisma.matchNomination.findUnique({
      where: { matchId_teamId: { matchId, teamId } },
    });
    if (!nomination) throw err('Nómina no encontrada', 404);
    return prisma.matchNomination.update({
      where: { id: nomination.id },
      data: { whatsappSentAt: new Date() },
    });
  },

  async getTeamRoster(teamId: string) {
    const players = await prisma.player.findMany({
      where: { teamId, isActive: true },
      include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      orderBy: { jerseyNumber: 'asc' },
    });
    return players.map((p) => ({
      id: p.id,
      name: `${p.user.firstName} ${p.user.lastName}`,
      number: p.jerseyNumber,
      position: p.position,
      phone: p.user.phone,
    }));
  },
};
