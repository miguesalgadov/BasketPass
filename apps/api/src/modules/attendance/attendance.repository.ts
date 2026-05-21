import { prisma } from '@/config/database';
import { BulkAttendanceDto } from './attendance.schema';

export const attendanceRepository = {
  bulkUpsert: async (dto: BulkAttendanceDto) => {
    const results = await prisma.$transaction(
      dto.attendances.map((a) => {
        const matchId = dto.sessionType === 'match' ? dto.sessionId : null;
        const trainingId = dto.sessionType === 'training' ? dto.sessionId : null;
        return prisma.attendance.upsert({
          where: { id: `${a.playerId}-${dto.sessionId}` },
          create: {
            id: `${a.playerId}-${dto.sessionId}`,
            playerId: a.playerId,
            matchId,
            trainingId,
            status: a.status,
            notes: a.notes,
          },
          update: { status: a.status, notes: a.notes },
        });
      })
    );
    return results;
  },

  findBySession: (sessionId: string, sessionType: 'match' | 'training') =>
    prisma.attendance.findMany({
      where: sessionType === 'match' ? { matchId: sessionId } : { trainingId: sessionId },
      include: {
        player: {
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        },
      },
    }),

  getClubStats: async (clubId: string) => {
    const players = await prisma.player.findMany({
      where: { user: { clubId }, isActive: true },
      select: {
        id: true, jerseyNumber: true, position: true,
        user: { select: { firstName: true, lastName: true } },
        team: { select: { name: true, category: true } },
        attendances: { select: { status: true } },
      },
    });
    return players.map((p) => {
      const total    = p.attendances.length;
      const present  = p.attendances.filter((a) => a.status === 'PRESENT').length;
      const late     = p.attendances.filter((a) => a.status === 'LATE').length;
      const absent   = p.attendances.filter((a) => a.status === 'ABSENT').length;
      const excused  = p.attendances.filter((a) => a.status === 'EXCUSED').length;
      const pct      = total > 0 ? Math.round(((present + late) / total) * 100) : null;
      return { player: { id: p.id, jerseyNumber: p.jerseyNumber, position: p.position, user: p.user, team: p.team }, total, present, late, absent, excused, percentage: pct };
    });
  },

  getPlayerStats: async (playerId: string) => {
    const [total, present] = await Promise.all([
      prisma.attendance.count({ where: { playerId } }),
      prisma.attendance.count({ where: { playerId, status: 'PRESENT' } }),
    ]);
    return { total, present, percentage: total > 0 ? Math.round((present / total) * 100) : 0 };
  },
};
