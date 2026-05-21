import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const category = searchParams.get('category');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const transactions = await prisma.cashTransaction.findMany({
    where: {
      clubId: auth.clubId,
      isVoided: false,
      ...(type && { type }),
      ...(category && { category }),
      ...(from && { date: { gte: new Date(from) } }),
      ...(to && { date: { lte: new Date(to) } }),
    },
    include: { createdBy: { select: { firstName: true, lastName: true } }, evidences: true },
    orderBy: { date: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });
  return ok(transactions);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const account = await prisma.clubAccount.findFirst({ where: { clubId: auth.clubId } });
    const balanceAfter = (account?.currentBalance || 0) + (body.type === 'INCOME' ? body.amount : -body.amount);

    const tx = await prisma.$transaction(async (prismaCtx) => {
      const transaction = await prismaCtx.cashTransaction.create({
        data: { ...body, clubId: auth.clubId, createdById: auth.id, date: new Date(body.date), balanceAfter },
        include: { createdBy: { select: { firstName: true, lastName: true } } },
      });
      if (account) {
        await prismaCtx.clubAccount.update({ where: { id: account.id }, data: { currentBalance: balanceAfter, lastUpdatedAt: new Date() } });
      }
      return transaction;
    });
    return ok(tx, 201);
  } catch (e: any) {
    return err(e.message, 'CREATE_ERROR', 400);
  }
}
