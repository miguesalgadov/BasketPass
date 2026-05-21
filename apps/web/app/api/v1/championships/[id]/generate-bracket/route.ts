import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const bracket = await prisma.playoffBracket.upsert({
    where: { championshipId: params.id },
    update: { structure: '{}', currentRound: 1 },
    create: { championshipId: params.id, structure: '{}', currentRound: 1 },
  });
  return ok(bracket);
}
