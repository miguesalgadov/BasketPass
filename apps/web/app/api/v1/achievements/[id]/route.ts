import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const achievement = await prisma.achievement.findUnique({
    where: { id: params.id },
    include: { _count: { select: { players: { where: { status: 'UNLOCKED' } } } } },
  });

  if (!achievement) return err('Achievement not found', 'NOT_FOUND', 404);
  return ok(achievement);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const body = await req.json();
  const achievement = await prisma.achievement.update({
    where: { id: params.id },
    data:  { isActive: body.isActive },
  });

  return ok(achievement);
}
