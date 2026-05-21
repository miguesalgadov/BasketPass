import { prisma } from '@/config/database';
import { BulkStatsDto } from './stats.schema';

export const statsRepository = {
  bulkUpsert: (dto: BulkStatsDto) =>
    prisma.$transaction(
      dto.stats.map((s) =>
        prisma.playerStat.upsert({
          where: { playerId_matchId: { playerId: s.playerId, matchId: dto.matchId } },
          create: { ...s, matchId: dto.matchId },
          update: s,
        })
      )
    ),

  findByMatch: (matchId: string) =>
    prisma.playerStat.findMany({
      where: { matchId },
      include: {
        player: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
      },
    }),

  findByPlayer: (playerId: string) =>
    prisma.playerStat.findMany({
      where: { playerId },
      include: { match: { select: { opponent: true, date: true, status: true } } },
      orderBy: { match: { date: 'desc' } },
      take: 20,
    }),

  getPlayerAverages: async (playerId: string) => {
    const agg = await prisma.playerStat.aggregate({
      where: { playerId },
      _avg: { points: true, rebounds: true, assists: true, steals: true, blocks: true, minutes: true },
      _sum: { freeThrowsMade: true, freeThrowsAttempted: true },
      _count: true,
    });
    const ftMade      = agg._sum.freeThrowsMade ?? 0;
    const ftAttempted = agg._sum.freeThrowsAttempted ?? 0;
    const freeThrowPct = ftAttempted > 0 ? Math.round((ftMade / ftAttempted) * 100) : null;
    return { averages: agg._avg, gamesPlayed: agg._count, freeThrowsMade: ftMade, freeThrowsAttempted: ftAttempted, freeThrowPct };
  },

  getTeamLeaderboard: async (teamId: string) => {
    const players = await prisma.player.findMany({
      where: { teamId, isActive: true },
      select: { id: true, jerseyNumber: true, position: true, user: { select: { firstName: true, lastName: true } } },
    });
    const leaderboard = await Promise.all(
      players.map(async (p) => {
        const agg = await prisma.playerStat.aggregate({
          where: { playerId: p.id },
          _avg: { points: true, rebounds: true, assists: true, steals: true, blocks: true, minutes: true },
          _sum: { freeThrowsMade: true, freeThrowsAttempted: true },
          _count: true,
        });
        const ftMade      = agg._sum.freeThrowsMade ?? 0;
        const ftAttempted = agg._sum.freeThrowsAttempted ?? 0;
        const freeThrowPct = ftAttempted > 0 ? Math.round((ftMade / ftAttempted) * 100) : null;
        return { player: p, averages: agg._avg, gamesPlayed: agg._count, freeThrowsMade: ftMade, freeThrowsAttempted: ftAttempted, freeThrowPct };
      })
    );
    return leaderboard.filter((r) => r.gamesPlayed > 0);
  },
};
