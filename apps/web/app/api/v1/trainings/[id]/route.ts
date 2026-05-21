import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const training = await prisma.training.findFirst({
    where: { id: params.id, team: { clubId: auth.clubId } },
    include: { team: true, attendances: { include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } } } },
  });
  if (!training) return err('Training not found', 'NOT_FOUND', 404);
  return ok(training);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const training = await prisma.training.update({
    where: { id: params.id },
    data: {
      ...(body.date && { date: new Date(body.date) }),
      ...(body.duration !== undefined && { duration: body.duration }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.plan !== undefined && { plan: body.plan }),
      ...(body.coachNotes !== undefined && { coachNotes: body.coachNotes }),
    },
    include: { team: true },
  });
  return ok(training);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  await prisma.training.delete({ where: { id: params.id } });
  return ok({ message: 'Training deleted' });
}
