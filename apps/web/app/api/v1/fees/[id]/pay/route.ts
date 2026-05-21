import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { paidAmount, paymentMethod, paidAt } = await req.json();
  const fee = await prisma.fee.update({
    where: { id: params.id },
    data: { status: 'PAID', paidAmount, paymentMethod, paidAt: paidAt ? new Date(paidAt) : new Date() },
    include: { feeType: true },
  });
  return ok(fee);
}
