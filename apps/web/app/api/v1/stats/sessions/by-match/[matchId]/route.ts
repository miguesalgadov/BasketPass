import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { matchId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const match = await prisma.match.findFirst({ where: { id: params.matchId, team: { clubId: auth.clubId } } });
  if (!match) return err('Match not found', 'NOT_FOUND', 404);

  const session = await prisma.matchStatSession.findFirst({
    where: { matchId: params.matchId },
    include: { lineups: true },
  });
  return ok(session);
}
