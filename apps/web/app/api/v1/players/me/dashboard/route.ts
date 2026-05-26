import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const player = await prisma.player.findFirst({
    where: { userId: auth.id },
    include: {
      team: { select: { id: true, name: true, category: true } },
      user: {
        select: {
          firstName: true, lastName: true, avatarUrl: true,
          club: { select: { name: true, primaryColor: true, slug: true } },
        },
      },
    },
  });

  const empty = {
    player: null, paymentStatus: 'OK', fees: [], upcomingEvents: [],
    season: { matchesPlayed: 0, wins: 0, losses: 0, attendanceRate: 0, callups: 0 },
    recentStats: [],
  };
  if (!player) return ok(empty);

  const now    = new Date();
  const cutoff = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [fees, stats, attendances, callups, upcomingMatches, upcomingTrainings] = await Promise.all([
    prisma.fee.findMany({
      where:   { playerId: player.id },
      include: { feeType: { select: { name: true, currency: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    }),
    prisma.playerStat.findMany({
      where:   { playerId: player.id },
      include: { match: { select: { date: true, opponent: true, isHome: true, scoreHome: true, scoreAway: true } } },
      orderBy: { match: { date: 'desc' } },
      take: 10,
    }),
    prisma.attendance.findMany({
      where:  { playerId: player.id },
      select: { status: true },
    }),
    prisma.matchNominationPlayer.count({ where: { playerId: player.id } }),
    prisma.match.findMany({
      where:   { teamId: player.teamId ?? undefined, date: { gte: now, lte: cutoff }, status: 'SCHEDULED' },
      orderBy: { date: 'asc' },
      take: 5,
    }),
    prisma.training.findMany({
      where:   { teamId: player.teamId ?? undefined, date: { gte: now, lte: cutoff } },
      orderBy: { date: 'asc' },
      take: 5,
    }),
  ]);

  // Payment status
  const overdueCount  = fees.filter((f) => f.status === 'OVERDUE').length;
  const paymentStatus = overdueCount === 0 ? 'OK' : overdueCount === 1 ? 'WARNING' : 'DANGER';

  // Season stats
  const matchesPlayed = stats.length;
  const wins = stats.filter((s) =>
    s.match.scoreHome != null && s.match.scoreAway != null &&
    (s.match.isHome ? s.match.scoreHome > s.match.scoreAway! : s.match.scoreAway! > s.match.scoreHome)
  ).length;
  const losses = stats.filter((s) =>
    s.match.scoreHome != null && s.match.scoreAway != null &&
    (s.match.isHome ? s.match.scoreHome < s.match.scoreAway! : s.match.scoreAway! < s.match.scoreHome)
  ).length;

  const present        = attendances.filter((a) => a.status === 'PRESENT').length;
  const attendanceRate = attendances.length > 0 ? Math.round((present / attendances.length) * 100) : 0;

  const avg = (fn: (s: typeof stats[0]) => number) =>
    matchesPlayed > 0 ? Math.round((stats.reduce((acc, s) => acc + fn(s), 0) / matchesPlayed) * 10) / 10 : 0;

  const upcomingEvents = [
    ...upcomingMatches.map((m) => ({
      id: m.id, type: 'MATCH' as const,
      date: m.date.toISOString(),
      title: `vs. ${m.opponent}`,
      location: m.location ?? null,
      isHome: m.isHome,
    })),
    ...upcomingTrainings.map((t) => ({
      id: t.id, type: 'TRAINING' as const,
      date: t.date.toISOString(),
      title: 'Entrenamiento',
      location: t.location ?? null,
      isHome: null,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return ok({
    player: {
      id:               player.id,
      firstName:        player.user.firstName,
      lastName:         player.user.lastName,
      photoUrl:         player.user.avatarUrl ?? null,
      jerseyNumber:     player.jerseyNumber   ?? null,
      position:         player.position       ?? null,
      height:           player.height         ?? null,
      weight:           player.weight         ?? null,
      team:             player.team           ?? null,
      club:             player.user.club      ?? null,
      seasonAvgPoints:   avg((s) => s.points),
      seasonAvgRebounds: avg((s) => s.rebounds),
      seasonAvgAssists:  avg((s) => s.assists),
      attendanceRate,
    },
    paymentStatus,
    fees: fees.map((f) => ({
      id:            f.id,
      month:         f.month,
      year:          f.year,
      status:        f.status,
      amount:        f.amount,
      paidAmount:    f.paidAmount ?? null,
      paidAt:        f.paidAt?.toISOString() ?? null,
      dueDate:       f.dueDate.toISOString(),
      feeType:       f.feeType,
    })),
    upcomingEvents,
    season: { matchesPlayed, wins, losses, attendanceRate, callups },
    recentStats: stats.map((s) => ({
      matchId:   s.matchId,
      matchDate: s.match.date.toISOString(),
      opponent:  s.match.opponent,
      points:    s.points,
      rebounds:  s.rebounds,
      assists:   s.assists,
      minutes:   s.minutes,
    })),
  });
}
