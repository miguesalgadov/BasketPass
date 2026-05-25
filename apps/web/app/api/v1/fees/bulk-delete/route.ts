import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const { feeIds } = await req.json();

  // Count paid fees to skip
  const paidCount = await prisma.fee.count({
    where: { id: { in: feeIds }, clubId: auth.clubId, status: 'PAID' },
  });

  const result = await prisma.fee.deleteMany({
    where: { id: { in: feeIds }, clubId: auth.clubId, status: { not: 'PAID' } },
  });

  return ok({ deleted: result.count, skipped: paidCount });
}
