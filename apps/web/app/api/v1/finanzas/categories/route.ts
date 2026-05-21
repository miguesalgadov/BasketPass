import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const categories = await prisma.cashCategory.findMany({
    where: { clubId: auth.clubId, isActive: true },
    orderBy: { name: 'asc' },
  });
  return ok(categories);
}
