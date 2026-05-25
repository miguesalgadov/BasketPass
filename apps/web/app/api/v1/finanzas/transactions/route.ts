import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const type     = searchParams.get('type');
  const category = searchParams.get('category');
  const search   = searchParams.get('search');
  const page     = parseInt(searchParams.get('page')  || '1');
  const limit    = parseInt(searchParams.get('limit') || '50');

  // Support both year/month and from/to filter styles
  let dateFilter: { gte?: Date; lte?: Date } | undefined;
  const yearParam  = searchParams.get('year');
  const monthParam = searchParams.get('month');
  const from       = searchParams.get('from');
  const to         = searchParams.get('to');

  if (yearParam && monthParam) {
    const y = parseInt(yearParam);
    const m = parseInt(monthParam);
    dateFilter = { gte: new Date(y, m - 1, 1), lte: new Date(y, m, 0, 23, 59, 59) };
  } else if (from || to) {
    dateFilter = {
      ...(from && { gte: new Date(from) }),
      ...(to   && { lte: new Date(to)   }),
    };
  }

  const where = {
    clubId: auth.clubId,
    isVoided: false,
    ...(type && type !== 'all' && { type }),
    ...(category && { category }),
    ...(dateFilter && { date: dateFilter }),
    ...(search && { concept: { contains: search, mode: 'insensitive' as const } }),
  };

  const [total, rows] = await Promise.all([
    prisma.cashTransaction.count({ where }),
    prisma.cashTransaction.findMany({
      where,
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        evidences: true,
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const transactions = rows.map(t => ({
    ...t,
    createdBy: `${t.createdBy.firstName} ${t.createdBy.lastName}`,
  }));

  return ok({ transactions, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  try {
    const body   = await req.json();
    const amount = Number(body.amount);
    if (!amount || amount <= 0) return err('Monto inválido', 'VALIDATION_ERROR', 400);

    const tx = await prisma.$transaction(async (ctx) => {
      // Ensure ClubAccount exists (create on first use)
      const account = await ctx.clubAccount.upsert({
        where:  { clubId: auth.clubId },
        create: { clubId: auth.clubId, currentBalance: 0 },
        update: {},
      });

      const balanceAfter = account.currentBalance + (body.type === 'INCOME' ? amount : -amount);

      const transaction = await ctx.cashTransaction.create({
        data: {
          accountId:       account.id,
          clubId:          auth.clubId,
          createdById:     auth.id,
          type:            body.type,
          amount,
          date:            new Date(body.date),
          concept:         String(body.concept),
          description:     body.description  || undefined,
          category:        String(body.category),
          paymentMethod:   body.paymentMethod   || undefined,
          referenceNumber: body.referenceNumber || undefined,
          balanceAfter,
        },
        include: { createdBy: { select: { firstName: true, lastName: true } } },
      });

      await ctx.clubAccount.update({
        where: { id: account.id },
        data:  { currentBalance: balanceAfter, lastUpdatedAt: new Date() },
      });

      return { ...transaction, createdBy: `${transaction.createdBy.firstName} ${transaction.createdBy.lastName}` };
    });
    return ok(tx, 201);
  } catch (e: any) {
    return err(e.message, 'CREATE_ERROR', 400);
  }
}
