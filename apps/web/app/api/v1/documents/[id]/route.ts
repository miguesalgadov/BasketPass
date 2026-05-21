import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const doc = await prisma.document.findFirst({ where: { id: params.id, clubId: auth.clubId } });
  if (!doc) return err('Document not found', 'NOT_FOUND', 404);

  await prisma.document.delete({ where: { id: params.id } });
  return ok({ message: 'Document deleted' });
}
