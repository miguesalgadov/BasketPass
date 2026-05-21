import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const teamId = searchParams.get('teamId');
  const feeTypeId = searchParams.get('feeTypeId');

  const players = await prisma.player.findMany({
    where: { user: { clubId: auth.clubId }, isActive: true, ...(teamId && { teamId }) },
    include: {
      user: { select: { firstName: true, lastName: true } },
      fees: {
        where: { year, ...(feeTypeId && { feeTypeId }) },
        include: { feeType: true },
      },
      team: { select: { id: true, name: true, category: true } },
    },
    orderBy: [{ team: { name: 'asc' } }, { user: { lastName: 'asc' } }],
  });
  return ok({ year, players });
}
