import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const types = await prisma.feeType.findMany({
    where: { clubId: auth.clubId, isActive: true },
    orderBy: { name: 'asc' },
  });
  return ok(types);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const type = await prisma.feeType.create({ data: { clubId: auth.clubId, ...body } });
    return ok(type, 201);
  } catch (e: any) {
    return err(e.message, 'CREATE_ERROR', 400);
  }
}
