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
      const groupId   = randomUUID();

      // Extract UTC time-of-day directly from body.date (already correct UTC from browser)
      const utcH = startDate.getUTCHours();
      const utcM = startDate.getUTCMinutes();

      // Compute day-of-week shift between the local calendar date and its UTC weekday.
      // body.localDate is "YYYY-MM-DD" (the user's intended local date).
      // Parsing it at noon UTC avoids midnight boundary issues.
      const localDate = (body.localDate as string) || body.date.slice(0, 10);
      const localUTCDay = new Date(localDate + 'T12:00:00Z').getUTCDay();
      const dayShift = ((startDate.getUTCDay() - localUTCDay) + 7) % 7;

      // Map each user-selected local weekday to its corresponding UTC weekday
      const utcDaysOfWeek = (body.daysOfWeek as number[]).map((d) => (d + dayShift) % 7);

      // Cursor iterates UTC calendar dates starting from the local start date
      const [sy, sm, sd] = localDate.split('-').map(Number);
      const cursor  = new Date(Date.UTC(sy, sm - 1, sd));

      const endDateStr = (body.recurrenceEndDate as string).slice(0, 10);
      const [ey, em, ed] = endDateStr.split('-').map(Number);
      const endDate = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59));

      const trainingsData: {
        teamId: string; date: Date; duration: number;
        location?: string; plan?: string; coachNotes?: string; recurrenceGroupId: string;
      }[] = [];

      while (cursor <= endDate) {
        if (utcDaysOfWeek.includes(cursor.getUTCDay())) {
          const trainingDate = new Date(Date.UTC(
            cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(),
            utcH, utcM, 0,
          ));
          if (trainingDate >= startDate) {
            trainingsData.push({
              teamId:   body.teamId,
              date:     trainingDate,
              duration: body.duration,
              ...(body.location   && { location: body.location }),
              ...(body.plan       && { plan: body.plan }),
              ...(body.coachNotes && { coachNotes: body.coachNotes }),
              recurrenceGroupId: groupId,
            });
          }
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
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
