import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';

export async function PATCH(req: NextRequest, { params }: { params: { id: string; matchId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const champ = await prisma.championship.findFirst({ where: { id: params.id, clubId: auth.clubId } });
  if (!champ) return err('Championship not found', 'NOT_FOUND', 404);

  const { scheduledAt, venue } = await req.json();
  const match = await prisma.champMatch.update({
    where: { id: params.matchId },
    data: { ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }), ...(venue && { venue }) },
  });
  return ok(match);
}
