import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const standings = await prisma.standing.findMany({
    where: { championshipId: params.id },
    include: { participant: { include: { team: { select: { id: true, name: true } } } } },
    orderBy: [{ tablePoints: 'desc' }, { pointsDiff: 'desc' }],
  });
  return ok(standings);
}
