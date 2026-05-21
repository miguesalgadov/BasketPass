import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const player = await prisma.player.findFirst({
    where: { userId: auth.id },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } }, team: { include: { coach: { select: { id: true, firstName: true, lastName: true } } } } },
  });
  return ok(player);
}
