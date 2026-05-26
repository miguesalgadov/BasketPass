import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { teamId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const players = await prisma.player.findMany({
    where: { teamId: params.teamId, isActive: true, user: { clubId: auth.clubId } },
    include: { user: { select: { firstName: true, lastName: true, avatarUrl: true, phone: true } } },
    orderBy: { jerseyNumber: 'asc' },
  });

  return ok(players.map((p) => ({
    id: p.id,
    name: `${p.user.firstName} ${p.user.lastName}`,
    number: p.jerseyNumber ?? null,
    position: p.position ?? null,
    phone: p.user.phone ?? null,
  })));
}
