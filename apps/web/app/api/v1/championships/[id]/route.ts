import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const c = await prisma.championship.findFirst({
    where: { id: params.id, deletedAt: null },
    include: {
      participants: { include: { team: { select: { id: true, name: true, category: true } } } },
      rounds: { include: { matches: { include: { homeTeam: true, awayTeam: true } } } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });
  if (!c) return err('Championship not found', 'NOT_FOUND', 404);
  return ok(c);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const c = await prisma.championship.update({
    where: { id: params.id },
    data: { ...body, ...(body.startDate && { startDate: new Date(body.startDate) }), ...(body.endDate && { endDate: new Date(body.endDate) }) },
  });
  return ok(c);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  await prisma.championship.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  return ok({ message: 'Championship deleted' });
}
