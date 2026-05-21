import { Response } from 'express';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { playersService } from './players.service';
import { createPlayerSchema, updatePlayerSchema, playerQuerySchema, importPlayersSchema } from './players.schema';
import { prisma } from '@/config/database';

export const playersController = {
  async getAll(req: AuthenticatedRequest, res: Response) {
    const query = playerQuerySchema.parse(req.query);
    const result = await playersService.getAll(req.user!.clubId, query);
    res.json({ success: true, data: result.players, meta: result.meta });
  },

  async getMe(req: AuthenticatedRequest, res: Response) {
    const player = await playersService.getByUserId(req.user!.id);
    res.json({ success: true, data: player });
  },

  async uploadAvatar(req: AuthenticatedRequest, res: Response) {
    if (!req.file) { res.status(400).json({ success: false, error: { message: 'No se recibió ningún archivo' } }); return; }
    const avatarUrl = `/players/${req.file.filename}`;
    await prisma.user.update({ where: { id: req.user!.id }, data: { avatarUrl } });
    res.json({ success: true, data: { avatarUrl } });
  },

  async getById(req: AuthenticatedRequest, res: Response) {
    const player = await playersService.getById(req.params.id, req.user!.clubId);
    res.json({ success: true, data: player });
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const dto = createPlayerSchema.parse(req.body);
    const { player } = await playersService.create(req.user!.clubId, dto);
    res.status(201).json({ success: true, data: player });
  },

  async update(req: AuthenticatedRequest, res: Response) {
    const dto = updatePlayerSchema.parse(req.body);
    const player = await playersService.update(req.params.id, req.user!.clubId, dto);
    res.json({ success: true, data: player });
  },

  async deactivate(req: AuthenticatedRequest, res: Response) {
    await playersService.deactivate(req.params.id, req.user!.clubId);
    res.json({ success: true, data: { message: 'Player deactivated' } });
  },

  async importPlayers(req: AuthenticatedRequest, res: Response) {
    const dto = importPlayersSchema.parse(req.body);
    const result = await playersService.import(req.user!.clubId, dto);
    res.status(201).json({ success: true, data: result });
  },

  async getDashboard(req: AuthenticatedRequest, res: Response) {
    const player = await prisma.player.findFirst({
      where: { userId: req.user!.id },
      select: {
        id: true, jerseyNumber: true, position: true, height: true, weight: true,
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        team: {
          select: {
            id: true, name: true, category: true,
            club: { select: { name: true, primaryColor: true, slug: true } },
          },
        },
      },
    });
    if (!player) {
      res.status(404).json({ success: false, error: { message: 'Player not found' } });
      return;
    }

    const year = new Date().getFullYear();
    const now = new Date();
    const cutoff = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const [fees, matches, trainings, recentStats, totalAtt, presentAtt] = await Promise.all([
      prisma.fee.findMany({
        where: { playerId: player.id, year },
        orderBy: { month: 'desc' },
        take: 6,
        select: { id: true, month: true, year: true, status: true, amount: true, paidAmount: true, paidAt: true, dueDate: true },
      }),
      player.team?.id
        ? prisma.match.findMany({
            where: { teamId: player.team.id, date: { gte: now, lte: cutoff }, status: 'SCHEDULED' },
            orderBy: { date: 'asc' },
            take: 5,
          })
        : Promise.resolve([]),
      player.team?.id
        ? prisma.training.findMany({
            where: { teamId: player.team.id, date: { gte: now, lte: cutoff } },
            orderBy: { date: 'asc' },
            take: 5,
          })
        : Promise.resolve([]),
      prisma.playerStat.findMany({
        where: { playerId: player.id },
        include: { match: { select: { date: true, opponent: true, scoreHome: true, scoreAway: true, isHome: true } } },
        orderBy: { match: { date: 'desc' } },
        take: 10,
      }),
      prisma.attendance.count({ where: { playerId: player.id } }),
      prisma.attendance.count({ where: { playerId: player.id, status: { in: ['PRESENT', 'LATE'] } } }),
    ]);

    const attendanceRate = totalAtt > 0 ? Math.round(presentAtt / totalAtt * 100) : 0;
    const withScores = recentStats.filter(s => s.match.scoreHome != null && s.match.scoreAway != null);
    const wins = withScores.filter(s =>
      s.match.isHome ? s.match.scoreHome! > s.match.scoreAway! : s.match.scoreAway! > s.match.scoreHome!
    ).length;
    const avgOf = (arr: number[]) =>
      arr.length > 0 ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0;

    const overdueCount = fees.filter(f => f.status === 'OVERDUE').length;
    const paymentStatus = overdueCount === 0 ? 'OK' : overdueCount === 1 ? 'WARNING' : 'DANGER';

    const upcomingEvents = [
      ...matches.map(m => ({ id: m.id, type: 'MATCH' as const, date: m.date, title: `vs. ${m.opponent}`, location: m.location ?? null, isHome: m.isHome })),
      ...trainings.map(t => ({ id: t.id, type: 'TRAINING' as const, date: t.date, title: 'Entrenamiento', location: t.location ?? null, isHome: null })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);

    res.json({
      success: true,
      data: {
        player: {
          id: player.id,
          firstName: player.user.firstName,
          lastName: player.user.lastName,
          photoUrl: player.user.avatarUrl ?? null,
          jerseyNumber: player.jerseyNumber ?? null,
          position: player.position ?? null,
          height: player.height ?? null,
          weight: player.weight ?? null,
          team: player.team ? { id: player.team.id, name: player.team.name, category: player.team.category } : null,
          club: player.team?.club ?? null,
          seasonAvgPoints: avgOf(recentStats.map(s => s.points)),
          seasonAvgRebounds: avgOf(recentStats.map(s => s.rebounds)),
          seasonAvgAssists: avgOf(recentStats.map(s => s.assists)),
          attendanceRate,
        },
        paymentStatus,
        fees,
        upcomingEvents,
        season: {
          matchesPlayed: recentStats.length,
          wins,
          losses: withScores.length - wins,
          attendanceRate,
          callups: recentStats.length,
        },
        recentStats: recentStats.slice(0, 6).map(s => ({
          matchId: s.matchId,
          matchDate: s.match.date,
          opponent: s.match.opponent,
          points: s.points,
          rebounds: s.rebounds,
          assists: s.assists,
          minutes: s.minutes,
        })),
      },
    });
  },
};
