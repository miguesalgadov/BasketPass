import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const existing = await prisma.cashTransaction.findFirst({ where: { id: params.id, clubId: auth.clubId } });
  if (!existing) return err('Transaction not found', 'NOT_FOUND', 404);
  if (existing.isVoided) return err('Transaction already voided', 'ALREADY_VOIDED', 400);

  const { reason } = await req.json();

  const tx = await prisma.$transaction(async (ctx) => {
    const voided = await ctx.cashTransaction.update({
      where: { id: params.id },
      data: { isVoided: true, voidReason: reason, voidedAt: new Date(), voidedById: auth.id },
    });

    // Revert balance
    const account = await ctx.clubAccount.findFirst({ where: { clubId: auth.clubId } });
    if (account) {
      const revert = existing.type === 'INCOME' ? -existing.amount : existing.amount;
      await ctx.clubAccount.update({
        where: { id: account.id },
        data: { currentBalance: account.currentBalance + revert, lastUpdatedAt: new Date() },
      });
    }
    return voided;
  });
  return ok(tx);
}
