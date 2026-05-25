import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const fee = await prisma.fee.findFirst({
    where: { id: params.id, clubId: auth.clubId },
    include: { player: { include: { user: { select: { firstName: true, lastName: true } } } }, feeType: true },
  });
  if (!fee) return err('Fee not found', 'NOT_FOUND', 404);
  return ok(fee);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const existing = await prisma.fee.findFirst({ where: { id: params.id, clubId: auth.clubId } });
  if (!existing) return err('Fee not found', 'NOT_FOUND', 404);

  const body = await req.json();
  const fee = await prisma.fee.update({
    where: { id: params.id },
    data: { ...body, ...(body.dueDate && { dueDate: new Date(body.dueDate) }), ...(body.paidAt && { paidAt: new Date(body.paidAt) }) },
    include: { player: { include: { user: { select: { firstName: true, lastName: true } } } }, feeType: true },
  });
  return ok(fee);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN') return forbidden();

  const existing = await prisma.fee.findFirst({ where: { id: params.id, clubId: auth.clubId } });
  if (!existing) return err('Fee not found', 'NOT_FOUND', 404);

  await prisma.fee.delete({ where: { id: params.id } });
  return ok({ message: 'Fee deleted' });
}
