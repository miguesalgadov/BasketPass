import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const player = await prisma.player.findFirst({ where: { userId: auth.id } });
  if (!player) return ok([]);

  const fees = await prisma.fee.findMany({
    where: { playerId: player.id },
    include: { feeType: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  return ok(fees);
}
