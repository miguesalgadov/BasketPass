import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const champ = await prisma.championship.findFirst({ where: { id: params.id, clubId: auth.clubId } });
  if (!champ) return err('Championship not found', 'NOT_FOUND', 404);

  const bracket = await prisma.playoffBracket.upsert({
    where: { championshipId: params.id },
    update: { structure: '{}', currentRound: 1 },
    create: { championshipId: params.id, structure: '{}', currentRound: 1 },
  });
  return ok(bracket);
}
