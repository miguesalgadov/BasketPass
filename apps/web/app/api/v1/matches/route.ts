import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');
  const status = searchParams.get('status');

  const matches = await prisma.match.findMany({
    where: {
      team: { clubId: auth.clubId },
      ...(teamId && { teamId }),
      ...(status && { status }),
    },
    include: { team: { select: { id: true, name: true, category: true } } },
    orderBy: { date: 'desc' },
  });
  return ok(matches);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const match = await prisma.match.create({
      data: {
        teamId: body.teamId, opponent: body.opponent, date: new Date(body.date),
        location: body.location, isHome: body.isHome ?? true, notes: body.notes,
      },
      include: { team: true },
    });
    return ok(match, 201);
  } catch (e: any) {
    return err(e.message, 'CREATE_ERROR', 400);
  }
}
