import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const team = await prisma.team.findFirst({
    where: { id: params.id, clubId: auth.clubId },
    include: {
      coach: { select: { id: true, firstName: true, lastName: true } },
      players: { where: { isActive: true }, include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
    },
  });
  if (!team) return err('Team not found', 'NOT_FOUND', 404);
  return ok(team);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const team = await prisma.team.update({
    where: { id: params.id },
    data: { ...(body.name && { name: body.name }), ...(body.category && { category: body.category }), ...(body.season && { season: body.season }), ...(body.coachId !== undefined && { coachId: body.coachId || null }), ...(body.isActive !== undefined && { isActive: body.isActive }) },
    include: { coach: { select: { id: true, firstName: true, lastName: true } } },
  });
  return ok(team);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  await prisma.team.update({ where: { id: params.id }, data: { isActive: false } });
  return ok({ message: 'Team deactivated' });
}
