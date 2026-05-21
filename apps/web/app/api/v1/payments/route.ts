import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const payments = await prisma.payment.findMany({
    where: { clubId: auth.clubId },
    include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  return ok(payments);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const payment = await prisma.payment.create({
      data: { clubId: auth.clubId, ...body, dueDate: body.dueDate ? new Date(body.dueDate) : null },
      include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });
    return ok(payment, 201);
  } catch (e: any) {
    return err(e.message, 'CREATE_ERROR', 400);
  }
}
