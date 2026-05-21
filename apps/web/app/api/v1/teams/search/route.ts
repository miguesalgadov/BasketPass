import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const q = new URL(req.url).searchParams.get('q') || '';
  const teams = await prisma.team.findMany({
    where: { clubId: auth.clubId, isActive: true, name: { contains: q, mode: 'insensitive' } },
    select: { id: true, name: true, category: true, season: true },
    take: 20,
  });
  return ok(teams);
}
