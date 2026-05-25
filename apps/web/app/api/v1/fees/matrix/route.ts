import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const year        = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const teamId      = searchParams.get('teamId') || undefined;
  const feeTypeIdParam = searchParams.get('feeTypeId') || undefined;

  const feeTypes = await prisma.feeType.findMany({
    where: { clubId: auth.clubId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, amount: true, currency: true },
  });

  const feeType = feeTypeIdParam
    ? feeTypes.find((ft) => ft.id === feeTypeIdParam) ?? null
    : feeTypes[0] ?? null;

  const resolvedFeeTypeId = feeType?.id;

  const players = await prisma.player.findMany({
    where: { user: { clubId: auth.clubId }, isActive: true, ...(teamId && { teamId }) },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      fees: {
        where: { year, ...(resolvedFeeTypeId && { feeTypeId: resolvedFeeTypeId }) },
        select: { id: true, month: true, status: true, amount: true, dueDate: true, paidAt: true, paidAmount: true, paymentMethod: true, notes: true },
      },
    },
    orderBy: [{ user: { lastName: 'asc' } }],
  });

  const now = new Date();
  const totals = {
    totalCharged: 0,
    totalPending: 0,
    overdueCount: 0,
    paymentRate:  0,
    byMonth: Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [i + 1, { charged: 0, pending: 0, paid: 0, overdue: 0, total: 0 }])
    ) as Record<number, { charged: number; pending: number; paid: number; overdue: number; total: number }>,
  };

  let totalActive = 0;
  let totalPaidCount = 0;

  const transformedPlayers = players.map((p) => {
    const feesRecord: Record<number, any | null> = {};
    let totalPaid = 0;

    for (const fee of p.fees) {
      let status = fee.status as string;
      if (status === 'PENDING' && fee.dueDate && new Date(fee.dueDate) < now) {
        status = 'OVERDUE';
      }

      feesRecord[fee.month] = { ...fee, status };

      const m = fee.month;
      totals.byMonth[m].total++;

      if (!['NOT_ENROLLED', 'EXEMPT', 'CANCELLED'].includes(status)) {
        totalActive++;
        if (status === 'PAID') {
          totalPaidCount++;
          const paid = fee.paidAmount ?? fee.amount;
          totalPaid += paid;
          totals.totalCharged += paid;
          totals.byMonth[m].charged += paid;
          totals.byMonth[m].paid++;
        } else {
          totals.totalPending += fee.amount;
          totals.byMonth[m].pending += fee.amount;
          if (status === 'OVERDUE') {
            totals.overdueCount++;
            totals.byMonth[m].overdue++;
          }
        }
      }
    }

    for (let m = 1; m <= 12; m++) {
      if (!feesRecord[m]) feesRecord[m] = null;
    }

    return {
      id:           p.id,
      firstName:    p.user.firstName,
      lastName:     p.user.lastName,
      email:        p.user.email,
      jerseyNumber: p.jerseyNumber,
      height:       p.height,
      teamId:       p.teamId,
      fees:         feesRecord,
      totalPaid,
    };
  });

  totals.paymentRate = totalActive > 0
    ? Math.round((totalPaidCount / totalActive) * 100)
    : 0;

  return ok({ year, feeTypes, feeType, players: transformedPlayers, totals });
}
