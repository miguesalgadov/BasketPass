import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { matchId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const session = await prisma.matchStatSession.findFirst({
    where: { matchId: params.matchId },
    include: { lineups: true },
  });
  return ok(session);
}
