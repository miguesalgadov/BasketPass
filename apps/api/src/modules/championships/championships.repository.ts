import { prisma } from '@/config/database';

const participantInclude = {
  team: { select: { id: true, name: true, category: true } },
  standing: true,
};

const champInclude = {
  participants: { include: participantInclude },
  createdBy: { select: { firstName: true, lastName: true } },
};

export const championshipsRepository = {
  findAll: (clubId: string) =>
    prisma.championship.findMany({
      where: { clubId, deletedAt: null },
      include: { _count: { select: { participants: true } } },
      orderBy: { createdAt: 'desc' },
    }),

  findById: (id: string, clubId: string) =>
    prisma.championship.findFirst({ where: { id, clubId, deletedAt: null }, include: champInclude }),

  create: (data: {
    clubId?: string; name: string; category: string; season: string;
    organizer?: string; format: string; scoringSystem: string; hasPlayoffs: boolean;
    playoffTeams: number; playoffFormat: string; playoffSeries: number;
    hasThirdPlace: boolean; playoffSeeding?: string;
    minTeams: number; maxTeams: number;
    numGroups?: number; teamsQualifyPerGroup?: number;
    startDate?: Date; endDate?: Date;
    daysBetweenRounds?: number; defaultVenue?: string;
    walkoverScore?: number; walkoverWaitMins?: number; maxForeignPlayers?: number;
    status?: string; createdById: string;
  }) => prisma.championship.create({ data, include: champInclude }),

  update: (id: string, data: Partial<{
    name: string; category: string; season: string; organizer: string;
    format: string; scoringSystem: string; hasPlayoffs: boolean;
    playoffTeams: number; playoffFormat: string; hasThirdPlace: boolean;
    playoffSeeding: string; minTeams: number; maxTeams: number;
    numGroups: number; teamsQualifyPerGroup: number;
    startDate: Date; endDate: Date; daysBetweenRounds: number;
    defaultVenue: string; walkoverScore: number; walkoverWaitMins: number;
    maxForeignPlayers: number | null; status: string;
    fixtureGeneratedAt: Date; deletedAt: Date | null; deleteReason: string;
  }>) => prisma.championship.update({ where: { id }, data }),

  delete: (id: string) => prisma.championship.delete({ where: { id } }),

  addParticipant: (data: {
    championshipId: string; teamId?: string;
    externalName?: string; externalShort?: string;
    externalCity?: string; externalContact?: string;
    isExternal?: boolean; seed?: number; addedById?: string;
    groupNumber?: number | null;
  }) => prisma.champParticipant.create({ data, include: participantInclude }),

  removeParticipant: (id: string) => prisma.champParticipant.delete({ where: { id } }),

  findParticipant: (id: string) =>
    prisma.champParticipant.findUnique({ where: { id }, include: participantInclude }),

  createRound: (data: {
    championshipId: string; number: number; name: string;
    phase: string; scheduledDate?: Date;
  }) => prisma.round.create({ data }),

  createMatch: (data: {
    championshipId: string; roundId: string; homeTeamId: string;
    awayTeamId: string; scheduledAt?: Date; isPlayoff?: boolean;
    playoffRound?: number; seriesGame?: number;
  }) => prisma.champMatch.create({ data }),

  findRounds: (championshipId: string) =>
    prisma.round.findMany({
      where: { championshipId },
      include: {
        matches: {
          include: {
            homeTeam: { include: { team: true } },
            awayTeam: { include: { team: true } },
          },
        },
      },
      orderBy: { number: 'asc' },
    }),

  findMatch: (id: string) =>
    prisma.champMatch.findUnique({
      where: { id },
      include: { championship: { select: { scoringSystem: true } } },
    }),

  updateMatch: (id: string, data: Partial<{
    homeScore: number; awayScore: number; status: string;
    isWalkover: boolean; walkoverTeamId: string;
    homeQ1: number; homeQ2: number; homeQ3: number; homeQ4: number; homeOT: number;
    awayQ1: number; awayQ2: number; awayQ3: number; awayQ4: number; awayOT: number;
  }>) => prisma.champMatch.update({ where: { id }, data }),

  findFinishedMatches: (championshipId: string) =>
    prisma.champMatch.findMany({
      where: { championshipId, status: { in: ['FINISHED', 'WALKOVER'] } },
    }),

  upsertStanding: (data: {
    championshipId: string; participantId: string; position: number;
    played: number; won: number; lost: number;
    walkoversWon: number; walkoversLost: number;
    pointsFor: number; pointsAgainst: number;
    tablePoints: number; pointsDiff: number; h2hRecord?: string;
  }) => prisma.standing.upsert({
    where: { participantId: data.participantId },
    create: data,
    update: data,
  }),

  findStandings: (championshipId: string) =>
    prisma.standing.findMany({
      where: { championshipId },
      include: { participant: { include: { team: true } } },
      orderBy: { position: 'asc' },
    }),

  upsertBracket: (data: {
    championshipId: string; structure: string; currentRound: number;
  }) => prisma.playoffBracket.upsert({
    where: { championshipId: data.championshipId },
    create: data,
    update: { structure: data.structure, currentRound: data.currentRound },
  }),

  findBracket: (championshipId: string) =>
    prisma.playoffBracket.findUnique({ where: { championshipId } }),

  saveStats: (matchId: string, stats: {
    playerId: string; teamParticipantId: string;
    minutes?: number; points?: number; fg2Made?: number; fg2Attempted?: number;
    fg3Made?: number; fg3Attempted?: number; ftMade?: number; ftAttempted?: number;
    offRebounds?: number; defRebounds?: number; assists?: number;
    steals?: number; blocks?: number; turnovers?: number;
    foulsPersonal?: number; foulsTechnical?: number; plusMinus?: number;
    didNotPlay?: boolean; dnpReason?: string;
  }[]) =>
    Promise.all(
      stats.map(s =>
        prisma.champPlayerStat.upsert({
          where: { matchId_playerId: { matchId, playerId: s.playerId } },
          create: { matchId, ...s },
          update: s,
        })
      )
    ),

  findLeaders: (championshipId: string) =>
    prisma.champPlayerStat.groupBy({
      by: ['playerId'],
      where: { match: { championshipId } },
      _count: { playerId: true },
      _avg: {
        points: true, assists: true, steals: true, blocks: true,
        offRebounds: true, defRebounds: true, ftMade: true, ftAttempted: true,
      },
      orderBy: { _avg: { points: 'desc' } },
      take: 10,
    }),

  addAuditLog: (data: {
    championshipId: string; userId: string; action: string; detail?: object;
  }) => prisma.champAuditLog.create({
    data: { ...data, detail: data.detail ? JSON.stringify(data.detail) : null },
  }),

  countFinishedMatches: (championshipId: string) =>
    prisma.champMatch.count({
      where: { championshipId, status: { in: ['FINISHED', 'WALKOVER'] } },
    }),

  deleteRelated: async (championshipId: string) => {
    await prisma.standing.deleteMany({ where: { championshipId } });
    await prisma.champParticipant.deleteMany({ where: { championshipId } });
    await prisma.champAuditLog.deleteMany({ where: { championshipId } });
    await prisma.championship.delete({ where: { id: championshipId } });
  },
};
