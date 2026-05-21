import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');

  const trainings = await prisma.training.findMany({
    where: { team: { clubId: auth.clubId }, ...(teamId && { teamId }) },
    include: { team: { select: { id: true, name: true, category: true } } },
    orderBy: { date: 'desc' },
  });
  return ok(trainings);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const groupId = body.recurrent ? randomUUID() : undefined;
    const training = await prisma.training.create({
      data: {
        teamId: body.teamId, date: new Date(body.date), duration: body.duration,
        location: body.location, plan: body.plan, coachNotes: body.coachNotes,
        recurrenceGroupId: groupId,
      },
      include: { team: true },
    });
    return ok(training, 201);
  } catch (e: any) {
    return err(e.message, 'CREATE_ERROR', 400);
  }
}
