import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const teamId = searchParams.get('teamId');
  const limit = parseInt(searchParams.get('limit') || '100');

  const players = await prisma.player.findMany({
    where: {
      user: {
        clubId: auth.clubId,
        isActive: true,
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      ...(teamId && { teamId }),
      isActive: true,
    },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true, role: true } }, team: true },
    take: limit,
    orderBy: [{ team: { name: 'asc' } }, { user: { lastName: 'asc' } }],
  });

  return ok(players.map((p) => ({
    ...p,
    team: p.team ? { ...p.team, category: p.team.category === 'Mayores' ? 'Senior' : p.team.category } : p.team,
  })));
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  try {
    const body = await req.json();
    const { email, firstName, lastName, phone, jerseyNumber, position, birthDate, height, weight, teamId, clothingSize } = body;

    const passwordHash = await bcrypt.hash('BasketPass2024!', 12);
    const user = await prisma.user.create({
      data: { clubId: auth.clubId, email, passwordHash, role: 'PLAYER', firstName, lastName, phone },
    });
    const player = await prisma.player.create({
      data: { userId: user.id, teamId: teamId || null, jerseyNumber, position, birthDate: birthDate ? new Date(birthDate) : null, height, weight, clothingSize },
      include: { user: true, team: true },
    });
    return ok(player, 201);
  } catch (e: any) {
    return err(e.message, 'CREATE_ERROR', 400);
  }
}
