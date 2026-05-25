import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, unauthorized, forbidden, ok, err } from '@/lib/auth-server';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');

  const trainings = await prisma.training.findMany({
    where: { team: { clubId: auth.clubId }, ...(teamId && { teamId }) },
    include: { team: { select: { id: true, name: true, category: true } } },
    orderBy: { date: 'desc' },
  });
  return ok(trainings);
}

export async function POST(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) return unauthorized();
  if (auth.role !== 'CLUB_ADMIN' && auth.role !== 'SUPER_ADMIN' && auth.role !== 'COACH') return forbidden();

  try {
    const body = await req.json();

    if (body.recurrent && body.daysOfWeek?.length && body.recurrenceEndDate) {
      const startDate = new Date(body.date);
      const endDate   = new Date(body.recurrenceEndDate);
      const hours     = startDate.getHours();
      const minutes   = startDate.getMinutes();
      const groupId   = randomUUID();

      const trainingsData: {
        teamId: string; date: Date; duration: number;
        location?: string; plan?: string; coachNotes?: string; recurrenceGroupId: string;
      }[] = [];

      const cursor = new Date(startDate);
      cursor.setHours(0, 0, 0, 0);

      while (cursor <= endDate) {
        if ((body.daysOfWeek as number[]).includes(cursor.getDay())) {
          const trainingDate = new Date(cursor);
          trainingDate.setHours(hours, minutes, 0, 0);
          if (trainingDate >= startDate) {
            trainingsData.push({
              teamId: body.teamId,
              date:   trainingDate,
              duration: body.duration,
              ...(body.location   && { location: body.location }),
              ...(body.plan       && { plan: body.plan }),
              ...(body.coachNotes && { coachNotes: body.coachNotes }),
              recurrenceGroupId: groupId,
            });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      if (trainingsData.length === 0) return err('No se generaron fechas de entrenamiento', 'VALIDATION_ERROR', 400);

      await prisma.training.createMany({ data: trainingsData });
      return ok({ count: trainingsData.length }, 201);
    }

    // Single training
    const training = await prisma.training.create({
      data: {
        teamId: body.teamId, date: new Date(body.date), duration: body.duration,
        location: body.location, plan: body.plan, coachNotes: body.coachNotes,
      },
      include: { team: true },
    });
    return ok({ count: 1, training }, 201);
  } catch (e: any) {
    return err(e.message, 'CREATE_ERROR', 400);
  }
}
