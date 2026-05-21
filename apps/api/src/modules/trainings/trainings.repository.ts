import { prisma } from '@/config/database';
import { UpdateTrainingDto } from './trainings.schema';

const include = { team: { select: { id: true, name: true, category: true } } };

export const trainingsRepository = {
  findAll: (clubId: string, teamId?: string) =>
    prisma.training.findMany({
      where: { team: { clubId }, ...(teamId && { teamId }) },
      include,
      orderBy: { date: 'desc' },
    }),

  findById: (id: string, clubId: string) =>
    prisma.training.findFirst({
      where: { id, team: { clubId } },
      include: {
        team: true,
        attendances: {
          include: {
            player: { include: { user: { select: { firstName: true, lastName: true } } } },
          },
        },
      },
    }),

  createMany: (records: {
    teamId: string; date: Date; duration: number;
    location?: string; plan?: string; coachNotes?: string;
    recurrenceGroupId?: string;
  }[]) =>
    prisma.$transaction(
      records.map((r) => prisma.training.create({ data: r, include }))
    ),

  update: (id: string, dto: UpdateTrainingDto) =>
    prisma.training.update({
      where: { id },
      data: { ...dto, date: dto.date ? new Date(dto.date) : undefined },
    }),

  delete: (id: string) =>
    prisma.training.delete({ where: { id } }),

  deleteSeries: (recurrenceGroupId: string, clubId: string, fromDate?: Date) =>
    prisma.training.deleteMany({
      where: {
        recurrenceGroupId,
        team: { clubId },
        ...(fromDate && { date: { gte: fromDate } }),
      },
    }),
};
