import { prisma } from '@/config/database';
import { CreateTeamDto, UpdateTeamDto } from './teams.schema';

export const teamsRepository = {
  findAll: (clubId: string) =>
    prisma.team.findMany({
      where: { clubId, isActive: true },
      include: {
        coach: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { players: true } },
      },
      orderBy: { name: 'asc' },
    }),

  findById: (id: string, clubId: string) =>
    prisma.team.findFirst({
      where: { id, clubId, isActive: true },
      include: {
        coach: { select: { id: true, firstName: true, lastName: true, email: true } },
        players: {
          where: { isActive: true },
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
      },
    }),

  create: (clubId: string, dto: CreateTeamDto) =>
    prisma.team.create({
      data: { ...dto, clubId },
      include: { coach: { select: { id: true, firstName: true, lastName: true } } },
    }),

  update: (id: string, dto: UpdateTeamDto) =>
    prisma.team.update({ where: { id }, data: dto }),

  delete: (id: string) =>
    prisma.team.update({ where: { id }, data: { isActive: false } }),

  findCoaches: (clubId: string) =>
    prisma.user.findMany({
      where: { clubId, role: 'COACH', isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    }),
};
