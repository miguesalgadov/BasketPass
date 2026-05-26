import { prisma } from '@/lib/prisma';

type RuleFn = (playerId: string) => Promise<number>;

// Returns the numeric metric value for a player (used to compare against threshold)
export const RULES: Record<string, RuleFn> = {

  // TODO: integrar con módulo de carnet digital cuando esté disponible
  has_digital_card: async (_playerId) => 0,

  profile_complete: async (playerId) => {
    const p = await prisma.player.findUnique({
      where: { id: playerId },
      select: { position: true, jerseyNumber: true, birthDate: true, user: { select: { avatarUrl: true } } },
    });
    if (!p) return 0;
    const complete = Boolean(p.position && p.jerseyNumber != null && p.birthDate && p.user.avatarUrl);
    return complete ? 1 : 0;
  },

  // Asistencias registradas (status PRESENT) de todos los entrenamientos
  attendance_count: async (playerId) => {
    return prisma.attendance.count({
      where: { playerId, status: 'PRESENT', trainingId: { not: null } },
    });
  },

  // Porcentaje de asistencia mensual más alto (entre los últimos 12 meses)
  monthly_attendance_pct: async (playerId) => {
    const trainings = await prisma.attendance.findMany({
      where:  { playerId, trainingId: { not: null } },
      select: { status: true, training: { select: { date: true } } },
    });

    const byMonth: Record<string, { present: number; total: number }> = {};
    for (const a of trainings) {
      if (!a.training) continue;
      const key = a.training.date.toISOString().slice(0, 7); // "YYYY-MM"
      if (!byMonth[key]) byMonth[key] = { present: 0, total: 0 };
      byMonth[key].total++;
      if (a.status === 'PRESENT') byMonth[key].present++;
    }

    let max = 0;
    for (const { present, total } of Object.values(byMonth)) {
      if (total > 0) max = Math.max(max, Math.round((present / total) * 100));
    }
    return max;
  },

  // Porcentaje de asistencia global de la temporada
  season_attendance_pct: async (playerId) => {
    const [present, total] = await Promise.all([
      prisma.attendance.count({ where: { playerId, status: 'PRESENT', trainingId: { not: null } } }),
      prisma.attendance.count({ where: { playerId, trainingId: { not: null } } }),
    ]);
    return total > 0 ? Math.round((present / total) * 100) : 0;
  },

  // Partidos jugados (estadísticas registradas en PlayerStat o ChampPlayerStat)
  matches_played: async (playerId) => {
    const [reg, champ] = await Promise.all([
      prisma.playerStat.count({ where: { playerId } }),
      prisma.champPlayerStat.count({ where: { playerId, didNotPlay: false } }),
    ]);
    return reg + champ;
  },

  // Puntos totales acumulados (partidos regulares + campeonatos)
  points_total: async (playerId) => {
    const [reg, champ] = await Promise.all([
      prisma.playerStat.aggregate({ where: { playerId }, _sum: { points: true } }),
      prisma.champPlayerStat.aggregate({ where: { playerId }, _sum: { points: true } }),
    ]);
    return (reg._sum.points ?? 0) + (champ._sum.points ?? 0);
  },

  // Triples totales (solo ChampPlayerStat — PlayerStat no registra triples)
  // TODO: integrar triples de partidos regulares cuando PlayerStat los registre
  threes_total: async (playerId) => {
    const result = await prisma.champPlayerStat.aggregate({
      where: { playerId },
      _sum: { fg3Made: true },
    });
    return result._sum.fg3Made ?? 0;
  },

  // Asistencias totales (partidos regulares + campeonatos)
  assists_total: async (playerId) => {
    const [reg, champ] = await Promise.all([
      prisma.playerStat.aggregate({ where: { playerId }, _sum: { assists: true } }),
      prisma.champPlayerStat.aggregate({ where: { playerId }, _sum: { assists: true } }),
    ]);
    return (reg._sum.assists ?? 0) + (champ._sum.assists ?? 0);
  },
};
