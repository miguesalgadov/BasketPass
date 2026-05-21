import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const [income, expense, account] = await Promise.all([
    prisma.cashTransaction.aggregate({
      where: { clubId: auth.clubId, type: 'INCOME', date: { gte: startDate, lte: endDate }, isVoided: false },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({
      where: { clubId: auth.clubId, type: 'EXPENSE', date: { gte: startDate, lte: endDate }, isVoided: false },
      _sum: { amount: true },
    }),
    prisma.clubAccount.findFirst({ where: { clubId: auth.clubId } }),
  ]);

  return ok({
    year, month,
    totalIncome: income._sum.amount || 0,
    totalExpense: expense._sum.amount || 0,
    netFlow: (income._sum.amount || 0) - (expense._sum.amount || 0),
    currentBalance: account?.currentBalance || 0,
  });
}
