import { prisma } from '@/config/database';
import { statsRepository } from './stats.repository';
import {
  calculatePIR,
  getActionPoints,
  isShotAction,
  isMadeShot,
  getShotType,
} from './fiba-pir.service';
import type {
  BulkStatsDto,
  CreateSessionDto,
  AddLineupDto,
  LogActionDto,
  AssignStatDto,
} from './stats.schema';

// ── Helpers ───────────────────────────────────────────────────────────────────

function err(msg: string, code = 400): Error {
  const e = new Error(msg);
  (e as any).statusCode = code;
  return e;
}

function getStatIncrements(action: string): Record<string, number> {
  const map: Record<string, Record<string, number>> = {
    FG2_MADE:             { fg2Made: 1, fg2Attempted: 1, points: 2 },
    FG2_MISSED:           { fg2Attempted: 1 },
    FG3_MADE:             { fg3Made: 1, fg3Attempted: 1, points: 3 },
    FG3_MISSED:           { fg3Attempted: 1 },
    FT_MADE:              { ftMade: 1, ftAttempted: 1, points: 1 },
    FT_MISSED:            { ftAttempted: 1 },
    OFF_REBOUND:          { offRebounds: 1 },
    DEF_REBOUND:          { defRebounds: 1 },
    ASSIST:               { assists: 1 },
    STEAL:                { steals: 1 },
    BLOCK:                { blocks: 1 },
    TURNOVER:             { turnovers: 1 },
    PERSONAL_FOUL:        { personalFouls: 1 },
    TECHNICAL_FOUL:       { technicalFouls: 1, personalFouls: 1 },
    UNSPORTSMANLIKE_FOUL: { unsportsmanlikeFouls: 1, personalFouls: 1 },
    DRAW_FOUL:            { drawFouls: 1 },
  };
  return map[action] ?? {};
}

function formatLineup(l: any) {
  return {
    id: l.id,
    sessionId: l.sessionId,
    participantId: l.participantId,
    playerId: l.playerId,
    name: l.player?.user
      ? `${l.player.user.firstName} ${l.player.user.lastName}`
      : l.externalPlayerName ?? 'Jugador',
    number: l.jerseyNumber ?? l.externalPlayerNumber,
    position: l.position,
    isStarter: l.isStarter,
    isOnCourt: l.isOnCourt,
    stats: l.stats ?? null,
  };
}

function formatBoxScoreLine(l: any) {
  const s = l.stats;
  return {
    lineupId: l.id,
    participantId: l.participantId,
    playerId: l.playerId,
    name: l.player?.user
      ? `${l.player.user.firstName} ${l.player.user.lastName}`
      : l.externalPlayerName ?? 'Jugador',
    number: l.jerseyNumber ?? l.externalPlayerNumber,
    position: l.position,
    didNotPlay: s?.didNotPlay ?? false,
    dnpReason: s?.dnpReason,
    min: Math.round(s?.minutesPlayed ?? 0),
    pts: s?.points ?? 0,
    fg2: `${s?.fg2Made ?? 0}/${s?.fg2Attempted ?? 0}`,
    fg3: `${s?.fg3Made ?? 0}/${s?.fg3Attempted ?? 0}`,
    ft: `${s?.ftMade ?? 0}/${s?.ftAttempted ?? 0}`,
    fg2Pct: s?.fg2Attempted
      ? Math.round((s.fg2Made / s.fg2Attempted) * 100)
      : null,
    fg3Pct: s?.fg3Attempted
      ? Math.round((s.fg3Made / s.fg3Attempted) * 100)
      : null,
    ftPct: s?.ftAttempted
      ? Math.round((s.ftMade / s.ftAttempted) * 100)
      : null,
    or: s?.offRebounds ?? 0,
    dr: s?.defRebounds ?? 0,
    reb: (s?.offRebounds ?? 0) + (s?.defRebounds ?? 0),
    ast: s?.assists ?? 0,
    stl: s?.steals ?? 0,
    blk: s?.blocks ?? 0,
    to: s?.turnovers ?? 0,
    pf: s?.personalFouls ?? 0,
    pir: s?.pir ?? 0,
    plusMinus: s?.plusMinus ?? 0,
  };
}

function formatSession(s: any) {
  const homeParticipantId = s.match?.homeTeamId ?? `${s.id}_home`;
  const awayParticipantId = s.match?.awayTeamId ?? `${s.id}_away`;
  const home = s.match?.homeTeam;
  const away = s.match?.awayTeam;
  const homePlayers = s.lineups
    .filter((l: any) => l.participantId === homeParticipantId)
    .map(formatLineup);
  const awayPlayers = s.lineups
    .filter((l: any) => l.participantId === awayParticipantId)
    .map(formatLineup);
  return {
    sessionId: s.id,
    matchId: s.matchId,
    status: s.status,
    period: s.period,
    clockSeconds: s.clockSeconds,
    homeTimeouts: s.homeTimeouts,
    awayTimeouts: s.awayTimeouts,
    homeScore: s.homeScore,
    awayScore: s.awayScore,
    periodScores: {
      home: JSON.parse(s.homePeriodScores ?? '[]'),
      away: JSON.parse(s.awayPeriodScores ?? '[]'),
    },
    startedAt: s.startedAt,
    finishedAt: s.finishedAt,
    analysisGenerated: s.analysisGenerated,
    home: {
      participantId: homeParticipantId,
      teamName: home?.team?.name ?? home?.externalName ?? s.homeTeamName ?? 'Local',
      color: '#F97316',
      players: homePlayers,
    },
    away: {
      participantId: awayParticipantId,
      teamName: away?.team?.name ?? away?.externalName ?? s.awayTeamName ?? 'Visitante',
      color: '#38BDF8',
      players: awayPlayers,
    },
    plays: s.plays,
    hasAnalysis: !!s.analysis,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const statsService = {
  // ── Match discovery ───────────────────────────────────────────────────────

  async getUpcomingMatches(clubId: string) {
    const champs = await prisma.championship.findMany({
      where: { clubId, deletedAt: null },
      select: { id: true, name: true },
    });
    const champIds = champs.map((c) => c.id);
    if (champIds.length === 0) return [];

    const oneWeekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const matches = await prisma.champMatch.findMany({
      where: {
        championshipId: { in: champIds },
        status: { in: ['SCHEDULED', 'LIVE', 'IN_PROGRESS', 'FINISHED'] },
        scheduledAt: { lte: oneWeekAhead },
      },
      include: {
        championship: { select: { id: true, name: true } },
        homeTeam: { include: { team: { select: { name: true } } } },
        awayTeam: { include: { team: { select: { name: true } } } },
        statSession: { select: { id: true, status: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 30,
    });

    return matches.map((m) => ({
      id: m.id,
      championshipId: m.championshipId,
      championshipName: (m.championship as any)?.name ?? '',
      scheduledAt: m.scheduledAt,
      status: m.status,
      homeTeam:
        (m.homeTeam as any)?.team?.name ??
        (m.homeTeam as any)?.externalName ??
        'Local',
      awayTeam:
        (m.awayTeam as any)?.team?.name ??
        (m.awayTeam as any)?.externalName ??
        'Visitante',
      sessionId: (m.statSession as any)?.id ?? null,
      sessionStatus: (m.statSession as any)?.status ?? null,
    }));
  },

  async createFriendly(
    userId: string,
    homeTeamName: string,
    awayTeamName: string,
    homeTeamId?: string,
    awayTeamId?: string,
  ) {
    let resolvedHomeName = homeTeamName;
    let resolvedAwayName = awayTeamName;

    if (homeTeamId) {
      const team = await prisma.team.findUnique({ where: { id: homeTeamId }, select: { name: true } });
      if (team) resolvedHomeName = team.name;
    }
    if (awayTeamId) {
      const team = await prisma.team.findUnique({ where: { id: awayTeamId }, select: { name: true } });
      if (team) resolvedAwayName = team.name;
    }

    return prisma.matchStatSession.create({
      data: {
        createdById: userId,
        homeTeamName: resolvedHomeName,
        awayTeamName: resolvedAwayName,
        homeBasketTeamId: homeTeamId ?? null,
        awayBasketTeamId: awayTeamId ?? null,
        status: 'NOT_STARTED',
      },
    });
  },

  async getRoster(sessionId: string) {
    const session = await prisma.matchStatSession.findUnique({
      where: { id: sessionId },
      select: { homeBasketTeamId: true, awayBasketTeamId: true },
    });
    if (!session) throw err('Session not found', 404);

    const fetchTeamPlayers = async (teamId: string | null) => {
      if (!teamId) return [];
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
          players: {
            where: { isActive: true },
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      });
      return (team?.players ?? []).map((p) => ({
        playerId: p.id,
        name: `${p.user.firstName} ${p.user.lastName}`,
        number: p.jerseyNumber ?? undefined,
        position: p.position ?? undefined,
      }));
    };

    const [home, away] = await Promise.all([
      fetchTeamPlayers(session.homeBasketTeamId),
      fetchTeamPlayers(session.awayBasketTeamId),
    ]);

    return { home, away };
  },

  async bulkAddLineup(
    sessionId: string,
    players: Array<{
      participantId: string;
      playerId?: string;
      externalPlayerName?: string;
      externalPlayerNumber?: number;
      jerseyNumber?: number;
      position?: string;
      isStarter?: boolean;
    }>,
  ) {
    const session = await prisma.matchStatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw err('Session not found', 404);

    const results = [];
    for (const p of players) {
      const existing = p.playerId
        ? await prisma.matchLineup.findFirst({ where: { sessionId, playerId: p.playerId } })
        : null;
      if (existing) { results.push(existing); continue; }

      const entry = await prisma.matchLineup.create({
        data: {
          sessionId,
          participantId: p.participantId,
          playerId: p.playerId ?? null,
          externalPlayerName: p.externalPlayerName ?? null,
          externalPlayerNumber: p.externalPlayerNumber ?? null,
          jerseyNumber: p.jerseyNumber ?? null,
          position: p.position ?? null,
          isStarter: p.isStarter ?? false,
          isOnCourt: false,
        },
      });
      results.push(entry);
    }
    return results;
  },

  // ── Legacy methods (backwards-compatible) ──────────────────────────────────

  recordMatchStats: (dto: BulkStatsDto) => statsRepository.bulkUpsert(dto),
  getMatchStats: (matchId: string) => statsRepository.findByMatch(matchId),
  getPlayerStats: (playerId: string) => statsRepository.findByPlayer(playerId),
  getPlayerAverages: (playerId: string) =>
    statsRepository.getPlayerAverages(playerId),
  getTeamLeaderboard: (teamId: string) =>
    statsRepository.getTeamLeaderboard(teamId),

  // ── Session lifecycle ──────────────────────────────────────────────────────

  async createSession(userId: string, dto: CreateSessionDto) {
    const existing = await prisma.matchStatSession.findUnique({
      where: { matchId: dto.matchId },
    });
    if (existing) return existing;
    return prisma.matchStatSession.create({
      data: {
        matchId: dto.matchId,
        championshipId: dto.championshipId,
        createdById: userId,
      },
    });
  },

  async getSession(sessionId: string) {
    const session = await prisma.matchStatSession.findUnique({
      where: { id: sessionId },
      include: {
        match: {
          include: {
            homeTeam: { include: { team: true } },
            awayTeam: { include: { team: true } },
          },
        },
        lineups: {
          include: {
            player: { include: { user: true } },
            stats: true,
          },
          orderBy: { jerseyNumber: 'asc' },
        },
        plays: {
          where: { isReverted: false },
          orderBy: { sequence: 'desc' },
          take: 30,
        },
        analysis: true,
      },
    });
    if (!session) throw err('Sesión no encontrada', 404);
    return formatSession(session);
  },

  async getSessionByMatchId(matchId: string) {
    return prisma.matchStatSession.findUnique({ where: { matchId } });
  },

  async startSession(sessionId: string) {
    return prisma.matchStatSession.update({
      where: { id: sessionId },
      data: {
        status: 'LIVE',
        startedAt: new Date(),
        period: 1,
        clockSeconds: 600,
      },
    });
  },

  async finishSession(sessionId: string) {
    await prisma.matchStatSession.update({
      where: { id: sessionId },
      data: { status: 'FINISHED', finishedAt: new Date() },
    });
    // Fire and forget AI analysis
    import('./post-match-analysis.service')
      .then((m) => m.generatePostMatchAnalysis(sessionId))
      .catch(() => {});
    return { ok: true };
  },

  // ── Lineup management ──────────────────────────────────────────────────────

  async addLineup(sessionId: string, dto: AddLineupDto) {
    // Create the lineup first
    const lineup = await prisma.matchLineup.create({
      data: {
        sessionId,
        participantId: dto.participantId,
        playerId: dto.playerId,
        externalPlayerName: dto.externalPlayerName,
        externalPlayerNumber: dto.externalPlayerNumber,
        isStarter: dto.isStarter ?? false,
        jerseyNumber: dto.jerseyNumber,
        position: dto.position,
        isOnCourt: dto.isStarter ?? false,
      },
    });
    // Create the linked stat record
    await prisma.matchPlayerStat.create({
      data: {
        sessionId,
        lineupId: lineup.id,
        participantId: dto.participantId,
        playerId: dto.playerId,
      },
    });
    // Return with relations
    return prisma.matchLineup.findUnique({
      where: { id: lineup.id },
      include: { player: { include: { user: true } }, stats: true },
    });
  },

  async patchLineup(lineupId: string, data: { isStarter?: boolean; isOnCourt?: boolean }) {
    return prisma.matchLineup.update({
      where: { id: lineupId },
      data,
    });
  },

  async getLineups(sessionId: string) {
    const lineups = await prisma.matchLineup.findMany({
      where: { sessionId },
      include: {
        player: { include: { user: true } },
        stats: true,
      },
      orderBy: { jerseyNumber: 'asc' },
    });
    return lineups.map(formatLineup);
  },

  // ── Play-by-play ───────────────────────────────────────────────────────────

  async logAction(sessionId: string, dto: LogActionDto) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.matchStatSession.findUnique({
        where: { id: sessionId },
      });
      if (!session) throw err('Sesión no encontrada', 404);
      if (
        session.status !== 'LIVE' &&
        session.status !== 'PERIOD_BREAK'
      ) {
        throw err('El partido no está en curso');
      }

      // Next sequence number
      const lastPlay = await tx.playByPlay.findFirst({
        where: { sessionId },
        orderBy: { sequence: 'desc' },
      });
      const sequence = (lastPlay?.sequence ?? 0) + 1;

      const pts = getActionPoints(dto.actionType);
      const newHomeScore =
        session.homeScore + (dto.team === 'home' ? pts : 0);
      const newAwayScore =
        session.awayScore + (dto.team === 'away' ? pts : 0);

      // Create play-by-play entry
      const play = await tx.playByPlay.create({
        data: {
          sessionId,
          sequence,
          period: session.period,
          clockSeconds: session.clockSeconds,
          team: dto.team,
          playerId: dto.playerId,
          lineupId: dto.lineupId,
          actionType: dto.actionType,
          points: pts,
          homeScore: newHomeScore,
          awayScore: newAwayScore,
        },
      });

      // Update player stat
      const increments = getStatIncrements(dto.actionType);
      if (Object.keys(increments).length > 0) {
        const stat = await tx.matchPlayerStat.findUnique({
          where: { lineupId: dto.lineupId },
        });
        if (stat) {
          const updated = await tx.matchPlayerStat.update({
            where: { lineupId: dto.lineupId },
            data: Object.fromEntries(
              Object.entries(increments).map(([k, v]) => [
                k,
                { increment: v },
              ]),
            ),
          });
          const pir = calculatePIR(updated as any);
          await tx.matchPlayerStat.update({
            where: { lineupId: dto.lineupId },
            data: { pir },
          });
        }
      }

      // Update session score
      if (pts > 0) {
        await tx.matchStatSession.update({
          where: { id: sessionId },
          data: { homeScore: newHomeScore, awayScore: newAwayScore },
        });
      }

      // Save shot attempt if coordinates provided
      if (
        isShotAction(dto.actionType) &&
        dto.courtX !== undefined &&
        dto.courtY !== undefined
      ) {
        await tx.shotAttempt.create({
          data: {
            sessionId,
            playById: play.id,
            playerId: dto.playerId,
            team: dto.team,
            courtX: dto.courtX,
            courtY: dto.courtY,
            shotType: getShotType(dto.actionType),
            isMade: isMadeShot(dto.actionType),
            period: session.period,
            clockSeconds: session.clockSeconds,
          },
        });
      }

      return { play, homeScore: newHomeScore, awayScore: newAwayScore };
    });
  },

  async undoLastAction(sessionId: string, userId: string) {
    const lastPlay = await prisma.playByPlay.findFirst({
      where: { sessionId, isReverted: false },
      orderBy: { sequence: 'desc' },
    });
    if (!lastPlay) throw err('No hay acciones para deshacer');

    await prisma.$transaction(async (tx) => {
      await tx.playByPlay.update({
        where: { id: lastPlay.id },
        data: {
          isReverted: true,
          revertedAt: new Date(),
          revertedById: userId,
        },
      });

      // Revert stat
      if (lastPlay.lineupId) {
        const increments = getStatIncrements(lastPlay.actionType);
        if (Object.keys(increments).length > 0) {
          const decrements = Object.fromEntries(
            Object.entries(increments).map(([k, v]) => [
              k,
              { decrement: v },
            ]),
          );
          const updated = await tx.matchPlayerStat.update({
            where: { lineupId: lastPlay.lineupId },
            data: decrements,
          });
          const pir = calculatePIR(updated as any);
          await tx.matchPlayerStat.update({
            where: { lineupId: lastPlay.lineupId },
            data: { pir },
          });
        }
      }

      // Revert score
      if (lastPlay.points > 0) {
        await tx.matchStatSession.update({
          where: { id: sessionId },
          data: {
            homeScore:
              lastPlay.team === 'home'
                ? { decrement: lastPlay.points }
                : undefined,
            awayScore:
              lastPlay.team === 'away'
                ? { decrement: lastPlay.points }
                : undefined,
          },
        });
      }

      // Remove shot attempt
      await tx.shotAttempt.deleteMany({ where: { playById: lastPlay.id } });
    });

    return { undonePlayId: lastPlay.id };
  },

  // ── Clock / period ─────────────────────────────────────────────────────────

  async advancePeriod(sessionId: string) {
    const session = await prisma.matchStatSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw err('Sesión no encontrada', 404);

    const newPeriod = session.period + 1;
    const homePeriodScores = JSON.parse(
      session.homePeriodScores,
    ) as number[];
    const awayPeriodScores = JSON.parse(
      session.awayPeriodScores,
    ) as number[];

    // Store current period's contribution to the score
    const homePrev = homePeriodScores
      .slice(0, session.period - 1)
      .reduce((a, b) => a + b, 0);
    const awayPrev = awayPeriodScores
      .slice(0, session.period - 1)
      .reduce((a, b) => a + b, 0);
    homePeriodScores[session.period - 1] = session.homeScore - homePrev;
    awayPeriodScores[session.period - 1] = session.awayScore - awayPrev;

    return prisma.matchStatSession.update({
      where: { id: sessionId },
      data: {
        period: newPeriod,
        clockSeconds: 600,
        status: newPeriod <= 4 ? 'LIVE' : 'OVERTIME',
        homePeriodScores: JSON.stringify(homePeriodScores),
        awayPeriodScores: JSON.stringify(awayPeriodScores),
      },
    });
  },

  async updateClock(sessionId: string, clockSeconds: number) {
    return prisma.matchStatSession.update({
      where: { id: sessionId },
      data: { clockSeconds },
    });
  },

  // ── Read endpoints ─────────────────────────────────────────────────────────

  async getBoxScore(sessionId: string) {
    const session = await prisma.matchStatSession.findUnique({
      where: { id: sessionId },
      include: {
        match: {
          include: {
            homeTeam: { include: { team: true } },
            awayTeam: { include: { team: true } },
          },
        },
      },
    });
    if (!session) throw err('Sesión no encontrada', 404);

    const lineups = await prisma.matchLineup.findMany({
      where: { sessionId },
      include: { player: { include: { user: true } }, stats: true },
      orderBy: [{ participantId: 'asc' }, { jerseyNumber: 'asc' }],
    });

    const homeId = session.match?.homeTeamId ?? null;
    const awayId = session.match?.awayTeamId ?? null;
    const homeTeam = (session.match as any)?.homeTeam;
    const awayTeam = (session.match as any)?.awayTeam;

    return {
      session: {
        id: session.id,
        status: session.status,
        period: session.period,
        home: {
          participantId: homeId,
          teamName: homeTeam?.team?.name ?? homeTeam?.externalName ?? (session as any).homeTeamName ?? 'Local',
          score: session.homeScore,
        },
        away: {
          participantId: awayId,
          teamName: awayTeam?.team?.name ?? awayTeam?.externalName ?? (session as any).awayTeamName ?? 'Visitante',
          score: session.awayScore,
        },
      },
      home: lineups.filter(l => l.participantId === homeId).map(formatBoxScoreLine),
      away: lineups.filter(l => l.participantId === awayId).map(formatBoxScoreLine),
    };
  },

  async getShotChart(sessionId: string) {
    const session = await prisma.matchStatSession.findUnique({
      where: { id: sessionId },
      include: {
        match: {
          include: {
            homeTeam: { include: { team: true } },
            awayTeam: { include: { team: true } },
          },
        },
      },
    });
    if (!session) throw err('Sesión no encontrada', 404);

    const attempts = await prisma.shotAttempt.findMany({ where: { sessionId } });
    const homeTeam = (session.match as any)?.homeTeam;
    const awayTeam = (session.match as any)?.awayTeam;

    return {
      session: {
        id: session.id,
        status: session.status,
        home: {
          teamName: homeTeam?.team?.name ?? homeTeam?.externalName ?? (session as any).homeTeamName ?? 'Local',
          score: session.homeScore,
        },
        away: {
          teamName: awayTeam?.team?.name ?? awayTeam?.externalName ?? (session as any).awayTeamName ?? 'Visitante',
          score: session.awayScore,
        },
      },
      shots: attempts.map(a => ({
        id: a.id,
        x: a.courtX,
        y: a.courtY,
        made: a.isMade,
        actionType: a.shotType === 'THREE_POINT' ? 'FG3_MADE' : 'FG2_MADE',
        period: a.period,
        team: a.team,
      })),
    };
  },

  async getPlays(sessionId: string) {
    return prisma.playByPlay.findMany({
      where: { sessionId },
      orderBy: { sequence: 'asc' },
    });
  },

  async getAnalysis(sessionId: string) {
    const session = await prisma.matchStatSession.findUnique({
      where: { id: sessionId },
      include: {
        match: {
          include: {
            homeTeam: { include: { team: true } },
            awayTeam: { include: { team: true } },
          },
        },
        analysis: true,
      },
    });
    if (!session) throw err('Sesión no encontrada', 404);

    const homeTeam = (session.match as any)?.homeTeam;
    const awayTeam = (session.match as any)?.awayTeam;
    const sessionInfo = {
      status: session.status,
      home: {
        teamName: homeTeam?.team?.name ?? homeTeam?.externalName ?? (session as any).homeTeamName ?? 'Local',
        score: session.homeScore,
      },
      away: {
        teamName: awayTeam?.team?.name ?? awayTeam?.externalName ?? (session as any).awayTeamName ?? 'Visitante',
        score: session.awayScore,
      },
    };

    if (!session.analysis) {
      return {
        sessionId,
        analysisGenerated: false,
        session: sessionInfo,
      };
    }

    const a = session.analysis;
    const strengths = JSON.parse(a.strengths ?? '{}');
    const topPerformer = JSON.parse(a.topPerformer ?? '{}');

    return {
      sessionId,
      analysisGenerated: true,
      generatedAt: a.generatedAt,
      session: sessionInfo,
      recap: a.recapText,
      mvp: { name: topPerformer.name, justification: topPerformer.justification },
      keyMoments: JSON.parse(a.keyMoments ?? '[]'),
      homeAnalysis: {
        teamName: sessionInfo.home.teamName,
        strengths: strengths.homeStrengths ?? [],
        weaknesses: strengths.homeWeaknesses ?? [],
      },
      awayAnalysis: {
        teamName: sessionInfo.away.teamName,
        strengths: strengths.awayStrengths ?? [],
        weaknesses: strengths.awayWeaknesses ?? [],
      },
      tacticalConclusion: strengths.tacticalConclusion,
    };
  },

  async triggerAnalysis(sessionId: string) {
    const { generatePostMatchAnalysis } = await import(
      './post-match-analysis.service'
    );
    generatePostMatchAnalysis(sessionId).catch(() => {});
    return { triggered: true };
  },

  async exportCSV(sessionId: string): Promise<string> {
    const plays = await prisma.playByPlay.findMany({
      where: { sessionId, isReverted: false },
      orderBy: { sequence: 'asc' },
    });
    const lineups = await prisma.matchLineup.findMany({
      where: { sessionId },
      include: { player: { include: { user: true } }, stats: true },
    });
    const header = 'seq,period,clock,team,player,action,pts,home_score,away_score';
    const lineupMap = new Map(lineups.map((l) => [l.id, l]));
    const rows = plays.map((p) => {
      const l = p.lineupId ? lineupMap.get(p.lineupId) : null;
      const name = (l as any)?.player?.user
        ? `${(l as any).player.user.firstName} ${(l as any).player.user.lastName}`
        : (l as any)?.externalPlayerName ?? '-';
      return [
        p.sequence,
        p.period,
        p.clockSeconds,
        p.team,
        `"${name}"`,
        p.actionType,
        p.points,
        p.homeScore,
        p.awayScore,
      ].join(',');
    });
    return [header, ...rows].join('\n');
  },

  // ── Assignment ─────────────────────────────────────────────────────────────

  async assignStatistician(assignedById: string, dto: AssignStatDto) {
    // Delete any existing assignment for this user+match pair
    await prisma.statMatchAssignment.deleteMany({
      where: { userId: dto.userId, matchId: dto.matchId },
    });
    return prisma.statMatchAssignment.create({
      data: { ...dto, assignedById },
    });
  },
};
