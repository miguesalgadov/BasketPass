import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const champ = await prisma.championship.findFirst({ where: { id: params.id, clubId: auth.clubId } });
  if (!champ) return err('Championship not found', 'NOT_FOUND', 404);

  const standings = await prisma.standing.findMany({
    where: { championshipId: params.id },
    include: { participant: { include: { team: { select: { id: true, name: true } } } } },
    orderBy: [{ tablePoints: 'desc' }, { pointsDiff: 'desc' }],
  });
  return ok(standings);
}
