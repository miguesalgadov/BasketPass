import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const existing = await prisma.fee.findFirst({ where: { id: params.id, clubId: auth.clubId } });
  if (!existing) return err('Fee not found', 'NOT_FOUND', 404);

  const fee = await prisma.fee.update({ where: { id: params.id }, data: { status: 'INJURED' } });
  return ok(fee);
}
