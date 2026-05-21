import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok } from '@/lib/auth-server';

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const type = new URL(req.url).searchParams.get('type') || 'training';

  const attendances = await prisma.attendance.findMany({
    where: type === 'match' ? { matchId: params.sessionId } : { trainingId: params.sessionId },
    include: {
      player: {
        include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
      },
    },
    orderBy: { player: { user: { lastName: 'asc' } } },
  });
  return ok(attendances);
}
