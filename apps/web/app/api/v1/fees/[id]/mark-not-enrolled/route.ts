import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const fee = await prisma.fee.update({ where: { id: params.id }, data: { status: 'NOT_ENROLLED' } });
  return ok(fee);
}
