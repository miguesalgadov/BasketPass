import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { ids, status, paidAt, paidAmount, paymentMethod } = await req.json();
  await prisma.fee.updateMany({
    where: { id: { in: ids }, clubId: auth.clubId },
    data: { status, ...(paidAt && { paidAt: new Date(paidAt) }), ...(paidAmount && { paidAmount }), ...(paymentMethod && { paymentMethod }) },
  });
  return ok({ updated: ids.length });
}
