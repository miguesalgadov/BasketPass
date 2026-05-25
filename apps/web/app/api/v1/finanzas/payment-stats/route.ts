import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const year  = parseInt(searchParams.get('year')  || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

  const [paidAgg, pendingAgg, overdueCount] = await Promise.all([
    prisma.fee.aggregate({
      where: { clubId: auth.clubId, year, month, status: 'PAID' },
      _sum: { paidAmount: true },
      _count: { id: true },
    }),
    prisma.fee.aggregate({
      where: { clubId: auth.clubId, year, month, status: { in: ['PENDING', 'OVERDUE'] } },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.fee.count({
      where: { clubId: auth.clubId, year, status: 'OVERDUE' },
    }),
  ]);

  const paidCount    = paidAgg._count.id;
  const pendingCount = pendingAgg._count.id;
  const total        = paidCount + pendingCount;
  const paymentRate  = total > 0 ? Math.round((paidCount / total) * 100) : 0;

  return ok({
    paidThisMonth: paidAgg._sum.paidAmount  || 0,
    paidCount,
    pendingTotal:  pendingAgg._sum.amount   || 0,
    pendingCount,
    overdueCount,
    paymentRate,
  });
}
