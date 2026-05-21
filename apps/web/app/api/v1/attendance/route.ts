import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, ok, err } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  try {
    const body = await req.json();
    const { sessionId, sessionType, attendances } = body;

    const records = await prisma.$transaction(
      attendances.map((a: { playerId: string; status: string; notes?: string }) =>
        prisma.attendance.upsert({
          where: { id: `att-${sessionType}-${sessionId}-${a.playerId}` },
          update: { status: a.status, notes: a.notes },
          create: {
            id: `att-${sessionType}-${sessionId}-${a.playerId}`,
            playerId: a.playerId,
            ...(sessionType === 'match' ? { matchId: sessionId } : { trainingId: sessionId }),
            status: a.status,
            notes: a.notes,
          },
        })
      )
    );
    return ok(records);
  } catch (e: any) {
    return err(e.message, 'ATTENDANCE_ERROR', 400);
  }
}
