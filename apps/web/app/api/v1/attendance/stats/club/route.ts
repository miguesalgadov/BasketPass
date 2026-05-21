import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const teams = await prisma.team.findMany({
    where: { clubId: auth.clubId, isActive: true },
    include: {
      players: {
        where: { isActive: true },
        include: {
          attendances: {
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
      },
    },
  });

  const stats = teams.map((team) => {
    const totalAttendances = team.players.flatMap((p) => p.attendances);
    const present = totalAttendances.filter((a) => a.status === 'PRESENT').length;
    const total = totalAttendances.length;
    return {
      teamId: team.id,
      teamName: team.name,
      category: team.category,
      attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
      total,
    };
  });

  return ok(stats);
}
