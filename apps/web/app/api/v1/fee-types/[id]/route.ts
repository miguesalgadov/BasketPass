import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const type = await prisma.feeType.findFirst({ where: { id: params.id, clubId: auth.clubId } });
  if (!type) return err('Not found', 'NOT_FOUND', 404);
  return ok(type);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  const body = await req.json();
  const type = await prisma.feeType.update({ where: { id: params.id }, data: body });
  return ok(type);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  await prisma.feeType.update({ where: { id: params.id }, data: { isActive: false } });
  return ok({ message: 'Fee type deactivated' });
}
