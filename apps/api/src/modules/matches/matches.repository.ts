import { prisma } from '@/config/database';
import { CreateMatchDto, UpdateMatchDto } from './matches.schema';

export const matchesRepository = {
  findAll: (clubId: string, teamId?: string) =>
    prisma.match.findMany({
      where: { team: { clubId }, ...(teamId && { teamId }) },
      include: { team: { select: { id: true, name: true, category: true } } },
      orderBy: { date: 'desc' },
    }),

  findById: (id: string, clubId: string) =>
    prisma.match.findFirst({
      where: { id, team: { clubId } },
      include: {
        team: true,
        stats: { include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } } },
        attendances: { include: { player: { include: { user: { select: { firstName: true, lastName: true } } } } } },
      },
    }),

  create: (dto: CreateMatchDto) =>
    prisma.match.create({ data: { ...dto, date: new Date(dto.date) } }),

  update: (id: string, dto: UpdateMatchDto) =>
    prisma.match.update({ where: { id }, data: { ...dto, date: dto.date ? new Date(dto.date) : undefined } }),

  delete: (id: string) =>
    prisma.match.delete({ where: { id } }),
};
