import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '100');

  const teams = await prisma.team.findMany({
    where: { clubId: auth.clubId, isActive: true },
    include: { coach: { select: { id: true, firstName: true, lastName: true } }, _count: { select: { players: { where: { isActive: true } } } } },
    take: limit,
    orderBy: { name: 'asc' },
  });
  return ok(teams.map((t) => ({ ...t, category: t.category === 'Mayores' ? 'Senior' : t.category })));
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const { name, category, season, coachId } = await req.json();
  const team = await prisma.team.create({
    data: { clubId: auth.clubId, name, category, season: season || '2025/2026', coachId: coachId || null },
    include: { coach: { select: { id: true, firstName: true, lastName: true } } },
  });
  return ok(team, 201);
}
