import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const player = await prisma.player.findFirst({
    where: { id: params.id, user: { clubId: auth.clubId } },
    include: { user: true, team: true, stats: { include: { match: true } }, attendances: true },
  });
  if (!player) return err('Player not found', 'NOT_FOUND', 404);
  return ok(player);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const body = await req.json();
  const { firstName, lastName, phone, email, jerseyNumber, position, birthDate, height, weight, teamId, clothingSize, isActive } = body;

  const player = await prisma.player.findFirst({ where: { id: params.id, user: { clubId: auth.clubId } } });
  if (!player) return err('Player not found', 'NOT_FOUND', 404);

  await prisma.user.update({
    where: { id: player.userId },
    data: { ...(firstName && { firstName }), ...(lastName && { lastName }), ...(phone !== undefined && { phone }), ...(email && { email }) },
  });
  const updated = await prisma.player.update({
    where: { id: params.id },
    data: {
      ...(jerseyNumber !== undefined && { jerseyNumber }),
      ...(position !== undefined && { position }),
      ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
      ...(height !== undefined && { height }),
      ...(weight !== undefined && { weight }),
      ...(teamId !== undefined && { teamId: teamId || null }),
      ...(clothingSize !== undefined && { clothingSize }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { user: true, team: true },
  });
  return ok(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const player = await prisma.player.findFirst({ where: { id: params.id, user: { clubId: auth.clubId } } });
  if (!player) return err('Player not found', 'NOT_FOUND', 404);

  await prisma.user.update({ where: { id: player.userId }, data: { isActive: false } });
  await prisma.player.update({ where: { id: params.id }, data: { isActive: false } });
  return ok({ message: 'Player deactivated' });
}
