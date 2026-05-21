import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

  const [paid, pending, overdue] = await Promise.all([
    prisma.fee.count({ where: { clubId: auth.clubId, year, month, status: 'PAID' } }),
    prisma.fee.count({ where: { clubId: auth.clubId, year, month, status: 'PENDING' } }),
    prisma.fee.count({ where: { clubId: auth.clubId, year, month, status: 'OVERDUE' } }),
  ]);

  return ok({ year, month, paid, pending, overdue, total: paid + pending + overdue });
}
