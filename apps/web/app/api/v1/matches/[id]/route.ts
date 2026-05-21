import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const match = await prisma.match.findFirst({
    where: { id: params.id, team: { clubId: auth.clubId } },
    include: { team: true, attendances: { include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } } }, stats: { include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } } } },
  });
  if (!match) return err('Match not found', 'NOT_FOUND', 404);
  return ok(match);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const match = await prisma.match.update({
    where: { id: params.id },
    data: {
      ...(body.opponent && { opponent: body.opponent }),
      ...(body.date && { date: new Date(body.date) }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.isHome !== undefined && { isHome: body.isHome }),
      ...(body.status && { status: body.status }),
      ...(body.scoreHome !== undefined && { scoreHome: body.scoreHome }),
      ...(body.scoreAway !== undefined && { scoreAway: body.scoreAway }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
    include: { team: true },
  });
  return ok(match);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  await prisma.match.delete({ where: { id: params.id } });
  return ok({ message: 'Match deleted' });
}
