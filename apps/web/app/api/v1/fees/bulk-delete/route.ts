import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { ids } = await req.json();
  await prisma.fee.deleteMany({ where: { id: { in: ids }, clubId: auth.clubId } });
  return ok({ deleted: ids.length });
}
