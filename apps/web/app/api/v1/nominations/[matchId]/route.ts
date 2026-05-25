import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { matchId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const match = await prisma.match.findFirst({ where: { id: params.matchId, team: { clubId: auth.clubId } } });
  if (!match) return err('Match not found', 'NOT_FOUND', 404);

  const teamId = new URL(req.url).searchParams.get('teamId');
  const nomination = await prisma.matchNomination.findFirst({
    where: { matchId: params.matchId, ...(teamId && { teamId }) },
    include: { players: { include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } } } },
  });
  return ok(nomination);
}

export async function PUT(req: NextRequest, { params }: { params: { matchId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const match = await prisma.match.findFirst({ where: { id: params.matchId, team: { clubId: auth.clubId } } });
  if (!match) return err('Match not found', 'NOT_FOUND', 404);

  try {
    const { teamId, playerIds, notes, jerseyColor, sockColor } = await req.json();
    const nomination = await prisma.matchNomination.upsert({
      where: { matchId_teamId: { matchId: params.matchId, teamId } },
      update: { notes, jerseyColor, sockColor, players: { deleteMany: {}, create: playerIds.map((pid: string) => ({ playerId: pid })) } },
      create: { matchId: params.matchId, teamId, coachId: auth.id, notes, jerseyColor, sockColor, players: { create: playerIds.map((pid: string) => ({ playerId: pid })) } },
      include: { players: { include: { player: true } } },
    });
    return ok(nomination);
  } catch (e: any) {
    return err(e.message, 'NOMINATION_ERROR', 400);
  }
}
