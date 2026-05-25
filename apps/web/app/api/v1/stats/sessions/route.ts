import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    if (body.matchId) {
      const match = await prisma.match.findFirst({ where: { id: body.matchId, team: { clubId: auth.clubId } } });
      if (!match) return err('Match not found', 'NOT_FOUND', 404);
    }
    const session = await prisma.matchStatSession.create({
      data: { ...body, createdById: auth.id },
    });
    return ok(session, 201);
  } catch (e: any) {
    return err(e.message, 'CREATE_ERROR', 400);
  }
}
