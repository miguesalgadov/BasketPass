import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get('playerId');
  const status = searchParams.get('status');
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;

  const fees = await prisma.fee.findMany({
    where: {
      clubId: auth.clubId,
      ...(playerId && { playerId }),
      ...(status && { status }),
      ...(year && { year }),
      ...(month && { month }),
    },
    include: { player: { include: { user: { select: { firstName: true, lastName: true } } } }, feeType: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  return ok(fees);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const fee = await prisma.fee.create({
      data: { clubId: auth.clubId, ...body, dueDate: new Date(body.dueDate) },
      include: { player: { include: { user: { select: { firstName: true, lastName: true } } } }, feeType: true },
    });
    return ok(fee, 201);
  } catch (e: any) {
    return err(e.message, 'CREATE_ERROR', 400);
  }
}
