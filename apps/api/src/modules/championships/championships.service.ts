import { prisma } from '@/config/database';
import { championshipsRepository as repo } from './championships.repository';
import { generateRoundRobin, generateGroupsFixture, generatePlayoffMatchups, GeneratedRound } from './fixture-generator.service';
import { getTablePoints, cappedDiff, sortStandings } from './fiba-scoring.service';
import {
  CreateChampionshipDto, AddParticipantDto, GenerateFixtureDto,
  LoadResultDto, WalkoverDto, LoadStatsDto, DeleteChampionshipDto,
  PatchMatchScheduleDto,
} from './championships.schema';

function err(msg: string, code = 400): Error {
  const e = new Error(msg);
  (e as any).statusCode = code;
  return e;
}

export const championshipsService = {
  list: (clubId: string) => repo.findAll(clubId),

  async getById(id: string, clubId: string) {
    const c = await repo.findById(id, clubId);
    if (!c) throw err('Campeonato no encontrado', 404);
    return c;
  },

  async create(clubId: string, userId: string, dto: CreateChampionshipDto) {
    // Check for duplicate name in the same season
    const existing = await prisma.championship.findFirst({
      where: { clubId, name: dto.name, season: dto.season, deletedAt: null },
    });
    if (existing) throw err('Ya existe un campeonato con ese nombre en esta temporada');

    const allTeamsPresent = dto.teams.length === dto.numTeams;
    const status = allTeamsPresent ? 'ACTIVE' : 'DRAFT';

    const champ = await repo.create({
      clubId, createdById: userId,
      name: dto.name, category: dto.category, season: dto.season,
      organizer: dto.organizer,
      format: dto.format, scoringSystem: dto.scoringSystem,
      hasPlayoffs: dto.hasPlayoffs, playoffTeams: dto.playoffTeams,
      playoffFormat: dto.playoffFormat, playoffSeries: dto.playoffSeries,
      hasThirdPlace: dto.hasThirdPlace, playoffSeeding: dto.playoffSeeding,
      minTeams: dto.numTeams, maxTeams: dto.numTeams,
      numGroups: dto.numGroups,
      teamsQualifyPerGroup: dto.teamsQualifyPerGroup,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      daysBetweenRounds: dto.daysBetweenRounds,
      defaultVenue: dto.defaultVenue,
      walkoverScore: dto.walkoverScore,
      walkoverWaitMins: dto.walkoverWaitMins,
      maxForeignPlayers: dto.maxForeignPlayers,
      status,
    });

    // Add participants
    const participants: { id: string }[] = [];
    const groupSize = dto.format === 'GROUPS_THEN_PLAYOFFS'
      ? Math.ceil(dto.numTeams / (dto.numGroups ?? 2))
      : null;
    for (let i = 0; i < dto.teams.length; i++) {
      const t = dto.teams[i];
      const short = t.externalShort?.trim() || t.externalName?.slice(0, 2).toUpperCase();
      const groupNumber = groupSize ? Math.floor(i / groupSize) + 1 : null;
      const p = await repo.addParticipant({
        championshipId: champ.id,
        teamId: t.isExternal ? undefined : t.teamId,
        isExternal: t.isExternal,
        externalName: t.isExternal ? t.externalName : undefined,
        externalShort: t.isExternal ? short : undefined,
        externalCity: t.isExternal ? t.externalCity : undefined,
        externalContact: t.isExternal ? t.externalContact : undefined,
        seed: i + 1,
        addedById: userId,
        groupNumber,
      });
      participants.push(p);

      // Init empty standing
      await prisma.standing.create({
        data: { championshipId: champ.id, participantId: p.id, position: i + 1 },
      });
    }

    // Generate fixture if all teams present
    let fixtureInfo = { rounds: 0, matches: 0 };
    if (allTeamsPresent && participants.length >= 2) {
      fixtureInfo = await generateAndSaveFixture(champ.id, participants, {
        format: dto.format,
        numGroups: dto.numGroups,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        daysBetweenRounds: dto.daysBetweenRounds ?? 7,
      });
      await repo.update(champ.id, { fixtureGeneratedAt: new Date() });
    }

    await repo.addAuditLog({
      championshipId: champ.id, userId,
      action: 'CREATED',
      detail: { teams: dto.teams.length, fixtureGenerated: fixtureInfo.rounds > 0, format: dto.format },
    });

    return { champId: champ.id, fixtureGenerated: fixtureInfo.rounds > 0, ...fixtureInfo };
  },

  async update(id: string, clubId: string, dto: Partial<CreateChampionshipDto>) {
    const c = await championshipsService.getById(id, clubId);
    if (c.status !== 'DRAFT' && c.status !== 'REGISTRATION') {
      throw err('Solo se puede editar en estado DRAFT o REGISTRATION');
    }
    if (dto.numTeams && dto.numTeams < c.participants.length) {
      throw err(`No puedes reducir a ${dto.numTeams} equipos porque ya hay ${c.participants.length} inscritos`);
    }
    return repo.update(id, {
      ...dto,
      minTeams: dto.numTeams,
      maxTeams: dto.numTeams,
      numGroups: dto.numGroups,
      teamsQualifyPerGroup: dto.teamsQualifyPerGroup,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate:   dto.endDate   ? new Date(dto.endDate)   : undefined,
    });
  },

  async delete(id: string, clubId: string, userId: string, dto: DeleteChampionshipDto) {
    const c = await championshipsService.getById(id, clubId);

    if (c.name.trim() !== dto.confirmName.trim()) {
      throw err('El nombre ingresado no coincide. Escríbelo exactamente.');
    }

    const finishedCount = await repo.countFinishedMatches(id);
    const hasResults = finishedCount > 0;

    if (!hasResults && c.status === 'DRAFT') {
      // Hard delete
      await repo.deleteRelated(id);
    } else {
      // Soft delete
      await repo.update(id, {
        deletedAt: new Date(),
        status: 'CANCELLED',
        deleteReason: dto.deleteReason || `Eliminado por usuario`,
      });
      await repo.addAuditLog({
        championshipId: id, userId,
        action: 'DELETED',
        detail: { hadResults: hasResults, matchesWithResults: finishedCount },
      });
      // Delete player stats linked to this championship's matches
      await prisma.champPlayerStat.deleteMany({
        where: { match: { championshipId: id } },
      });
    }

    return { wasHardDelete: !hasResults };
  },

  async start(id: string, clubId: string) {
    await championshipsService.getById(id, clubId);
    return repo.update(id, { status: 'REGISTRATION' });
  },

  async addParticipant(id: string, clubId: string, userId: string, dto: AddParticipantDto) {
    const champ = await championshipsService.getById(id, clubId);
    if (!['DRAFT', 'REGISTRATION'].includes(champ.status)) {
      throw err('No se pueden agregar equipos a un campeonato ya iniciado');
    }
    if (champ.participants.length >= champ.maxTeams) {
      throw err(`Ya hay ${champ.maxTeams} equipos. No se pueden agregar más`);
    }
    const short = dto.externalShort?.trim() || dto.externalName?.slice(0, 2).toUpperCase();
    const p = await repo.addParticipant({
      championshipId: id,
      teamId: dto.isExternal ? undefined : dto.teamId,
      isExternal: dto.isExternal,
      externalName: dto.isExternal ? dto.externalName : undefined,
      externalShort: dto.isExternal ? short : undefined,
      externalCity: dto.isExternal ? dto.externalCity : undefined,
      externalContact: dto.isExternal ? dto.externalContact : undefined,
      seed: champ.participants.length + 1,
      addedById: userId,
    });
    await prisma.standing.create({
      data: { championshipId: id, participantId: p.id, position: champ.participants.length + 1 },
    });
    await repo.addAuditLog({
      championshipId: id, userId, action: 'TEAM_ADDED',
      detail: { teamName: dto.externalName || dto.teamId, isExternal: dto.isExternal },
    });
    return p;
  },

  async removeParticipant(id: string, pid: string, clubId: string) {
    const champ = await championshipsService.getById(id, clubId);
    if (!['DRAFT', 'REGISTRATION'].includes(champ.status)) {
      throw err('No se puede eliminar equipos de un campeonato activo');
    }
    await prisma.standing.deleteMany({ where: { championshipId: id, participantId: pid } });
    await repo.removeParticipant(pid);
    // Reorder seeds
    const remaining = await prisma.champParticipant.findMany({
      where: { championshipId: id }, orderBy: { addedAt: 'asc' },
    });
    for (let i = 0; i < remaining.length; i++) {
      await prisma.champParticipant.update({ where: { id: remaining[i].id }, data: { seed: i + 1 } });
    }
    return { ok: true };
  },

  async generateFixture(id: string, clubId: string, userId: string, dto: GenerateFixtureDto) {
    const champ = await championshipsService.getById(id, clubId);
    if (!['DRAFT', 'REGISTRATION'].includes(champ.status)) {
      throw err('El fixture ya fue generado o el campeonato no está en borrador');
    }
    if (champ.participants.length < champ.maxTeams) {
      throw err(`Faltan ${champ.maxTeams - champ.participants.length} equipo(s) para generar el fixture`);
    }
    if ((champ as any).fixtureGeneratedAt) {
      throw err('El fixture ya fue generado. Elimina el campeonato para regenerar');
    }

    // Delete existing rounds/matches if any
    await prisma.champMatch.deleteMany({ where: { championshipId: id } });
    await prisma.round.deleteMany({ where: { championshipId: id } });

    const info = await generateAndSaveFixture(id, champ.participants, {
      format: champ.format,
      numGroups: champ.numGroups ?? undefined,
      startDate: new Date(dto.startDate),
      daysBetweenRounds: dto.daysBetweenRounds ?? 7,
    });

    await repo.update(id, { status: 'ACTIVE', fixtureGeneratedAt: new Date(), startDate: new Date(dto.startDate) });
    await repo.addAuditLog({
      championshipId: id, userId, action: 'FIXTURE_GENERATED',
      detail: { totalRounds: info.rounds, totalMatches: info.matches },
    });
    return info;
  },

  async getRounds(id: string) {
    const rawRounds = await repo.findRounds(id);
    return rawRounds.map(r => ({
      id: r.id,
      name: r.name,
      number: r.number,
      phase: r.phase,
      startDate: r.scheduledDate,
      matches: r.matches.map(m => ({
        id: m.id,
        homeTeam: {
          id: m.homeTeamId,
          name: (m.homeTeam as any).team?.name ?? (m.homeTeam as any).externalName ?? '?',
        },
        awayTeam: {
          id: m.awayTeamId,
          name: (m.awayTeam as any).team?.name ?? (m.awayTeam as any).externalName ?? '?',
        },
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
        scheduledAt: m.scheduledAt,
        venue: m.venue,
      })),
    }));
  },

  async loadResult(champId: string, matchId: string, clubId: string, dto: LoadResultDto) {
    const match = await repo.findMatch(matchId);
    if (!match || match.championshipId !== champId) throw err('Partido no encontrado', 404);

    await repo.updateMatch(matchId, {
      homeScore: dto.homeScore, awayScore: dto.awayScore,
      status: 'FINISHED',
      homeQ1: dto.homeQ1, homeQ2: dto.homeQ2, homeQ3: dto.homeQ3, homeQ4: dto.homeQ4, homeOT: dto.homeOT,
      awayQ1: dto.awayQ1, awayQ2: dto.awayQ2, awayQ3: dto.awayQ3, awayQ4: dto.awayQ4, awayOT: dto.awayOT,
    });

    await recalculateStandings(champId, match.championship.scoringSystem);
    return { ok: true };
  },

  async loadWalkover(champId: string, matchId: string, clubId: string, dto: WalkoverDto) {
    const match = await repo.findMatch(matchId);
    if (!match || match.championshipId !== champId) throw err('Partido no encontrado', 404);

    const champ = await prisma.championship.findUnique({ where: { id: champId } });
    const woScore = (champ as any)?.walkoverScore ?? 20;

    await repo.updateMatch(matchId, {
      isWalkover: true, walkoverTeamId: dto.walkoverTeamId,
      homeScore: match.homeTeamId === dto.walkoverTeamId ? woScore : 0,
      awayScore: match.awayTeamId === dto.walkoverTeamId ? woScore : 0,
      status: 'WALKOVER',
    });

    await recalculateStandings(champId, match.championship.scoringSystem);
    return { ok: true };
  },

  async loadStats(champId: string, matchId: string, dto: LoadStatsDto) {
    await repo.saveStats(matchId, dto.stats);
    return { saved: dto.stats.length };
  },

  async getStandings(id: string) {
    const raw = await repo.findStandings(id);
    return raw.map(s => {
      const p = s.participant as any;
      return {
        position: s.position,
        participantId: s.participantId,
        teamId: p.teamId ?? s.participantId,
        teamName: p.team?.name ?? p.externalName ?? '?',
        groupNumber: p.groupNumber ?? null,
        played: s.played,
        wins: s.won,
        losses: s.lost,
        walkoverWins: s.walkoversWon,
        walkoverLosses: s.walkoversLost,
        pointsFor: s.pointsFor,
        pointsAgainst: s.pointsAgainst,
        pointsDiff: s.pointsDiff,
        points: s.tablePoints,
      };
    });
  },

  async generateBracket(id: string, clubId: string) {
    const champ = await championshipsService.getById(id, clubId);
    if (!champ.hasPlayoffs) throw err('Este campeonato no tiene playoffs');

    const standings = await repo.findStandings(id);
    const qualified = standings.slice(0, champ.playoffTeams);
    const matchups = generatePlayoffMatchups(qualified.map(s => s.participantId));

    const teamName = (pid: string) => {
      const s = standings.find(st => st.participantId === pid);
      const p = s?.participant;
      if (!p) return 'TBD';
      return (p as any).team?.name ?? (p as any).externalName ?? 'TBD';
    };

    const seedOf = (pid: string) => standings.findIndex(s => s.participantId === pid) + 1;

    const makeMatchup = (m: { seed1: string; seed2: string }, prefix: string, i: number) => ({
      id:       `${prefix}-${i}`,
      team1:    { id: m.seed1, name: teamName(m.seed1), seed: seedOf(m.seed1), score: null as number | null },
      team2:    { id: m.seed2, name: teamName(m.seed2), seed: seedOf(m.seed2), score: null as number | null },
      winnerId: null as string | null,
      status:   'PENDING',
    });

    const sfMatchups = champ.playoffTeams === 8 ? matchups.slice(4) : matchups;
    const qfMatchups = champ.playoffTeams === 8 ? matchups.slice(0, 4) : undefined;

    const structure = {
      teams:         champ.playoffTeams,
      format:        champ.playoffFormat,
      quarterfinals: qfMatchups ? qfMatchups.map((m, i) => makeMatchup(m, 'qf', i)) : undefined,
      semifinals:    sfMatchups.map((m, i) => makeMatchup(m, 'sf', i)),
      thirdPlace:    champ.hasThirdPlace ? { id: 'third', team1: null, team2: null, winnerId: null, status: 'PENDING' } : undefined,
      final:         { id: 'final', team1: null, team2: null, winnerId: null, status: 'PENDING' },
      champion:      null as string | null,
    };

    await repo.upsertBracket({ championshipId: id, structure: JSON.stringify(structure), currentRound: 1 });
    await repo.update(id, { status: 'PLAYOFFS' });
    return structure;
  },

  async getBracket(id: string, clubId: string) {
    await championshipsService.getById(id, clubId);
    const bracket = await repo.findBracket(id);
    if (!bracket) return null;
    return { ...bracket, structure: JSON.parse(bracket.structure) };
  },

  async patchMatchSchedule(champId: string, matchId: string, clubId: string, dto: PatchMatchScheduleDto) {
    const match = await repo.findMatch(matchId);
    if (!match || match.championshipId !== champId) throw err('Partido no encontrado', 404);
    await championshipsService.getById(champId, clubId); // auth check

    await prisma.champMatch.update({
      where: { id: matchId },
      data: {
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        venue:       dto.venue !== undefined ? (dto.venue || null) : undefined,
        homeTeamId:  dto.homeTeamId ?? undefined,
        awayTeamId:  dto.awayTeamId ?? undefined,
      },
    });
    return { ok: true };
  },

  async getLeaders(id: string, clubId: string) {
    await championshipsService.getById(id, clubId);
    const raw = await repo.findLeaders(id);
    const playerIds = raw.map(r => r.playerId);
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true } },
        team: { select: { name: true } },
      },
    });
    const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

    return raw.map(r => ({
      playerId: r.playerId,
      player: playerMap[r.playerId],
      gamesPlayed: r._count.playerId,
      avgPoints:    r._avg.points ?? 0,
      avgRebounds:  ((r._avg.offRebounds ?? 0) + (r._avg.defRebounds ?? 0)),
      avgAssists:   r._avg.assists ?? 0,
      avgSteals:    r._avg.steals ?? 0,
      avgBlocks:    r._avg.blocks ?? 0,
      ftPct: (r._avg.ftAttempted ?? 0) > 0
        ? Math.round(((r._avg.ftMade ?? 0) / (r._avg.ftAttempted ?? 1)) * 100)
        : null,
    }));
  },
};

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

async function generateAndSaveFixture(
  championshipId: string,
  participants: { id: string }[],
  opts: {
    format: string;
    numGroups?: number;
    startDate: Date;
    daysBetweenRounds: number;
  }
): Promise<{ rounds: number; matches: number }> {
  let rounds: GeneratedRound[];

  if (opts.format === 'GROUPS_THEN_PLAYOFFS' && opts.numGroups && opts.numGroups > 1) {
    const groupSize = Math.ceil(participants.length / opts.numGroups);
    const groups: { id: string }[][] = [];
    for (let g = 0; g < opts.numGroups; g++) {
      groups.push(participants.slice(g * groupSize, (g + 1) * groupSize));
    }
    rounds = generateGroupsFixture(groups, opts.startDate, opts.daysBetweenRounds);
  } else {
    const fmt = opts.format === 'DOUBLE_ROUND_ROBIN' ? 'DOUBLE_ROUND_ROBIN' : 'SINGLE_ROUND_ROBIN';
    rounds = generateRoundRobin(participants, fmt, opts.startDate, opts.daysBetweenRounds);
  }

  for (const r of rounds) {
    const round = await repo.createRound({
      championshipId, number: r.number, name: r.name,
      phase: r.phase ?? 'REGULAR', scheduledDate: r.scheduledDate,
    });
    for (const m of r.matches) {
      await repo.createMatch({
        championshipId, roundId: round.id,
        homeTeamId: m.homeId, awayTeamId: m.awayId,
        scheduledAt: r.scheduledDate,
      });
    }
  }

  return { rounds: rounds.length, matches: rounds.reduce((a, r) => a + r.matches.length, 0) };
}

async function recalculateStandings(championshipId: string, scoringSystem: string) {
  const champ = await prisma.championship.findUnique({
    where: { id: championshipId },
    include: { participants: true },
  });
  if (!champ) return;

  const matches = await repo.findFinishedMatches(championshipId);

  type S = {
    participantId: string; played: number; won: number; lost: number;
    walkoversWon: number; walkoversLost: number;
    pointsFor: number; pointsAgainst: number; tablePoints: number; pointsDiff: number;
  };
  const standings = new Map<string, S>();
  const h2h: Record<string, Record<string, { won: number; lost: number; pf: number; pa: number }>> = {};

  for (const p of champ.participants) {
    standings.set(p.id, {
      participantId: p.id, played: 0, won: 0, lost: 0,
      walkoversWon: 0, walkoversLost: 0,
      pointsFor: 0, pointsAgainst: 0, tablePoints: 0, pointsDiff: 0,
    });
    h2h[p.id] = {};
  }

  for (const m of matches) {
    const home = standings.get(m.homeTeamId)!;
    const away = standings.get(m.awayTeamId)!;
    if (!home || !away) continue;

    if (m.isWalkover) {
      const wid = m.walkoverTeamId!;
      const lid = wid === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
      const w = standings.get(wid)!;
      const l = standings.get(lid)!;
      w.played++; w.walkoversWon++; w.pointsFor += 20; w.tablePoints += 2;
      l.played++; l.walkoversLost++; l.pointsAgainst += 20; l.tablePoints += 0;
      updateH2H(h2h, wid, lid, 20, 0);
      continue;
    }

    const hs = m.homeScore ?? 0;
    const as_ = m.awayScore ?? 0;
    home.played++; away.played++;
    home.pointsFor += hs; home.pointsAgainst += as_;
    away.pointsFor += as_; away.pointsAgainst += hs;

    if (hs > as_) {
      home.won++; away.lost++;
      home.tablePoints += getTablePoints('WIN', scoringSystem);
      away.tablePoints += getTablePoints('LOSS', scoringSystem);
    } else {
      away.won++; home.lost++;
      away.tablePoints += getTablePoints('WIN', scoringSystem);
      home.tablePoints += getTablePoints('LOSS', scoringSystem);
    }

    home.pointsDiff += cappedDiff(hs, as_);
    away.pointsDiff += cappedDiff(as_, hs);
    updateH2H(h2h, m.homeTeamId, m.awayTeamId, hs, as_);
  }

  const isGroups = (champ as any).format === 'GROUPS_THEN_PLAYOFFS';

  if (isGroups) {
    const byGroup = new Map<number, S[]>();
    for (const s of standings.values()) {
      const p = (champ as any).participants.find((pp: any) => pp.id === s.participantId);
      const g = p?.groupNumber ?? 1;
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g)!.push(s);
    }
    for (const [_g, groupStandings] of [...byGroup.entries()].sort((a, b) => a[0] - b[0])) {
      const gH2h: typeof h2h = {};
      for (const gs of groupStandings) gH2h[gs.participantId] = h2h[gs.participantId] ?? {};
      const sorted = sortStandings(groupStandings, gH2h);
      for (let i = 0; i < sorted.length; i++) {
        const s = sorted[i];
        await repo.upsertStanding({
          championshipId, participantId: s.participantId, position: i + 1,
          played: s.played, won: s.won, lost: s.lost,
          walkoversWon: s.walkoversWon, walkoversLost: s.walkoversLost,
          pointsFor: s.pointsFor, pointsAgainst: s.pointsAgainst,
          tablePoints: s.tablePoints, pointsDiff: s.pointsDiff,
          h2hRecord: JSON.stringify(h2h[s.participantId] ?? {}),
        });
      }
    }
  } else {
    const sorted = sortStandings([...standings.values()], h2h);
    for (let i = 0; i < sorted.length; i++) {
      const s = sorted[i];
      await repo.upsertStanding({
        championshipId, participantId: s.participantId, position: i + 1,
        played: s.played, won: s.won, lost: s.lost,
        walkoversWon: s.walkoversWon, walkoversLost: s.walkoversLost,
        pointsFor: s.pointsFor, pointsAgainst: s.pointsAgainst,
        tablePoints: s.tablePoints, pointsDiff: s.pointsDiff,
        h2hRecord: JSON.stringify(h2h[s.participantId] ?? {}),
      });
    }
  }
}

function updateH2H(
  h2h: Record<string, Record<string, { won: number; lost: number; pf: number; pa: number }>>,
  homeId: string, awayId: string, hs: number, as_: number
) {
  if (!h2h[homeId][awayId]) h2h[homeId][awayId] = { won: 0, lost: 0, pf: 0, pa: 0 };
  if (!h2h[awayId][homeId]) h2h[awayId][homeId] = { won: 0, lost: 0, pf: 0, pa: 0 };
  h2h[homeId][awayId].pf += hs; h2h[homeId][awayId].pa += as_;
  h2h[awayId][homeId].pf += as_; h2h[awayId][homeId].pa += hs;
  if (hs > as_) { h2h[homeId][awayId].won++; h2h[awayId][homeId].lost++; }
  else          { h2h[awayId][homeId].won++; h2h[homeId][awayId].lost++; }
}
