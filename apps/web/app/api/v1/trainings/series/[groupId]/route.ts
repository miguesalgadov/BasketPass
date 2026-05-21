import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function DELETE(req: NextRequest, { params }: { params: { groupId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const fromDate = new URL(req.url).searchParams.get('fromDate');

  await prisma.training.deleteMany({
    where: {
      recurrenceGroupId: params.groupId,
      team: { clubId: auth.clubId },
      ...(fromDate && { date: { gte: new Date(fromDate) } }),
    },
  });
  return ok({ message: 'Series deleted' });
}
