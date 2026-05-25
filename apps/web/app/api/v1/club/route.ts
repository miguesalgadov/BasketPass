import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const club = await prisma.club.findUnique({ where: { id: auth.clubId } });
  return ok(club);
}

export async function PATCH(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') {
    return err('Only admins can update club settings', 'FORBIDDEN', 403);
  }

  try {
    const { name, primaryColor, logo } = await req.json();
    const club = await prisma.club.update({
      where: { id: auth.clubId },
      data: {
        ...(name         && { name }),
        ...(primaryColor && { primaryColor }),
        ...(logo !== undefined && { logo }),
      },
    });
    return ok(club);
  } catch (e: any) {
    return err(e.message, 'UPDATE_ERROR', 400);
  }
}
