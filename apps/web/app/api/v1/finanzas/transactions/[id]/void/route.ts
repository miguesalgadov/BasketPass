import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const existing = await prisma.cashTransaction.findFirst({ where: { id: params.id, clubId: auth.clubId } });
  if (!existing) return err('Transaction not found', 'NOT_FOUND', 404);

  const { voidReason } = await req.json();
  const tx = await prisma.cashTransaction.update({
    where: { id: params.id },
    data: { isVoided: true, voidReason, voidedAt: new Date(), voidedById: auth.id },
  });
  return ok(tx);
}
