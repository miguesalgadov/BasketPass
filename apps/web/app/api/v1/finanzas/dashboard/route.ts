import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

const CATEGORY_LABELS: Record<string, string> = {
  MONTHLY_FEE: 'Cuota mensual', REGISTRATION: 'Inscripción',
  TOURNAMENT_FEE: 'Inscripción torneo', SPONSORSHIP: 'Auspicio',
  DONATION: 'Donación', SUBSIDY: 'Subvención', OTHER_INCOME: 'Otro ingreso',
  VENUE_RENTAL: 'Arriendo cancha', EQUIPMENT: 'Equipamiento',
  TRANSPORT: 'Transporte', REFEREE: 'Arbitraje',
  TOURNAMENT_ENTRY: 'Inscripción campeonato', COACH_FEE: 'Honorarios entrenador',
  MEDICAL: 'Gastos médicos', CLEANING: 'Útiles de aseo',
  ADMIN: 'Administrativos', OTHER_EXPENSE: 'Otro egreso', ADJUSTMENT: 'Ajuste',
};

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const year  = parseInt(searchParams.get('year')  || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

  const startDate    = new Date(year, month - 1, 1);
  const endDate      = new Date(year, month, 0, 23, 59, 59);
  const prevStart    = new Date(year, month - 2, 1);
  const prevEnd      = new Date(year, month - 1, 0, 23, 59, 59);

  // Build last-6-months range
  const chart: { year: number; month: number; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    chart.push({
      year: d.getFullYear(), month: d.getMonth() + 1,
      label: d.toLocaleDateString('es-AR', { month: 'short' }),
    });
  }

  const [income, expense, prevInc, prevExp, account, recentRaw, expGroups] = await Promise.all([
    prisma.cashTransaction.aggregate({
      where: { clubId: auth.clubId, type: 'INCOME', date: { gte: startDate, lte: endDate }, isVoided: false },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({
      where: { clubId: auth.clubId, type: 'EXPENSE', date: { gte: startDate, lte: endDate }, isVoided: false },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({
      where: { clubId: auth.clubId, type: 'INCOME', date: { gte: prevStart, lte: prevEnd }, isVoided: false },
      _sum: { amount: true },
    }),
    prisma.cashTransaction.aggregate({
      where: { clubId: auth.clubId, type: 'EXPENSE', date: { gte: prevStart, lte: prevEnd }, isVoided: false },
      _sum: { amount: true },
    }),
    prisma.clubAccount.findFirst({ where: { clubId: auth.clubId } }),
    prisma.cashTransaction.findMany({
      where: { clubId: auth.clubId, isVoided: false },
      include: { evidences: { select: { id: true } } },
      orderBy: { date: 'desc' },
      take: 8,
    }),
    prisma.cashTransaction.groupBy({
      by: ['category'],
      where: { clubId: auth.clubId, type: 'EXPENSE', date: { gte: startDate, lte: endDate }, isVoided: false },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  // Chart data — one query per bucket
  const chartData = await Promise.all(
    chart.map(async (bucket) => {
      const s = new Date(bucket.year, bucket.month - 1, 1);
      const e = new Date(bucket.year, bucket.month, 0, 23, 59, 59);
      const [inc, exp] = await Promise.all([
        prisma.cashTransaction.aggregate({
          where: { clubId: auth.clubId, type: 'INCOME',  date: { gte: s, lte: e }, isVoided: false },
          _sum: { amount: true },
        }),
        prisma.cashTransaction.aggregate({
          where: { clubId: auth.clubId, type: 'EXPENSE', date: { gte: s, lte: e }, isVoided: false },
          _sum: { amount: true },
        }),
      ]);
      return { label: bucket.label, income: inc._sum.amount || 0, expense: exp._sum.amount || 0 };
    }),
  );

  return ok({
    year, month,
    currentBalance: account?.currentBalance   || 0,
    currency:       account?.currency         || 'CLP',
    monthIncome:    income._sum.amount        || 0,
    monthExpense:   expense._sum.amount       || 0,
    netFlow:        (income._sum.amount || 0) - (expense._sum.amount || 0),
    prevIncome:     prevInc._sum.amount       || 0,
    prevExpense:    prevExp._sum.amount       || 0,
    chartData,
    categoryBreakdown: expGroups.map(g => ({
      category: g.category,
      label:    CATEGORY_LABELS[g.category] ?? g.category,
      total:    g._sum.amount || 0,
      count:    g._count.id,
    })),
    recentTransactions: recentRaw.map(t => ({
      id: t.id, type: t.type, amount: t.amount,
      concept: t.concept, category: t.category,
      date: t.date.toISOString(),
      evidenceCount: t.evidences.length,
    })),
  });
}
