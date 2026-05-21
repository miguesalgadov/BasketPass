import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    include: { club: true },
  });
  if (!user) return unauthorized();

  const { passwordHash: _, ...safeUser } = user;
  return ok({ user: safeUser });
}
