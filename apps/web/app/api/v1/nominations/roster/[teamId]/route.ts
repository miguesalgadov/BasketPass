import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { teamId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const players = await prisma.player.findMany({
    where: { teamId: params.teamId, isActive: true, user: { clubId: auth.clubId } },
    include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { jerseyNumber: 'asc' },
  });
  return ok(players);
}
