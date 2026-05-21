import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const rounds = await prisma.round.findMany({
    where: { championshipId: params.id },
    include: {
      matches: {
        include: {
          homeTeam: true, awayTeam: true,
          playerStats: { include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } } },
        },
      },
    },
    orderBy: { number: 'asc' },
  });
  return ok(rounds);
}
