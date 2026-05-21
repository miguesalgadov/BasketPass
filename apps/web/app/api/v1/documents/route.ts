import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const type = new URL(req.url).searchParams.get('type');
  const docs = await prisma.document.findMany({
    where: { clubId: auth.clubId, ...(type && { type }) },
    include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { uploadedAt: 'desc' },
  });
  return ok(docs);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const doc = await prisma.document.create({
      data: { clubId: auth.clubId, ...body, expiresAt: body.expiresAt ? new Date(body.expiresAt) : null },
    });
    return ok(doc, 201);
  } catch (e: any) {
    return err(e.message, 'CREATE_ERROR', 400);
  }
}
