import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string; matchId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { scheduledAt, venue } = await req.json();
  const match = await prisma.champMatch.update({
    where: { id: params.matchId },
    data: { ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }), ...(venue && { venue }) },
  });
  return ok(match);
}
