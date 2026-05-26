import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') ?? undefined;

  const achievements = await prisma.achievement.findMany({
    where:   { isActive: true, ...(category && { category: category as any }) },
    orderBy: [{ category: 'asc' }, { rarity: 'asc' }, { name: 'asc' }],
  });

  return ok(achievements);
}
