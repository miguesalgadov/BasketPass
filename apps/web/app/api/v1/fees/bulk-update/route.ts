import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const { feeIds, status, paidAt, paidAmount, paymentMethod, notes } = await req.json();
  const result = await prisma.fee.updateMany({
    where: { id: { in: feeIds }, clubId: auth.clubId },
    data: {
      status,
      ...(paidAt         && { paidAt: new Date(paidAt) }),
      ...(paidAmount     && { paidAmount }),
      ...(paymentMethod  && { paymentMethod }),
      ...(notes          && { notes }),
    },
  });
  return ok({ updated: result.count });
}
