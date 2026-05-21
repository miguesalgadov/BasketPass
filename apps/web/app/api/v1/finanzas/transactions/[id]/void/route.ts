import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { voidReason } = await req.json();
  const tx = await prisma.cashTransaction.update({
    where: { id: params.id },
    data: { isVoided: true, voidReason, voidedAt: new Date(), voidedById: auth.id },
  });
  return ok(tx);
}
