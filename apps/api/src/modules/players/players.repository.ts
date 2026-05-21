import { prisma } from '@/config/database';
import { CreatePlayerDto, UpdatePlayerDto, PlayerQuery } from './players.schema';

export const playersRepository = {
  findAll: async (clubId: string, query: PlayerQuery) => {
    const { page, limit, search, teamId, isActive } = query;
    const skip = (page - 1) * limit;

    const where = {
      user: { clubId, isActive: isActive ?? true },
      ...(teamId && { teamId }),
      ...(search && {
        user: {
          clubId,
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        },
      }),
    };

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
        skip,
        take: limit,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, phone: true, rut: true } }, team: { select: { id: true, name: true, category: true } } },
        orderBy: { user: { lastName: 'asc' } },
      }),
      prisma.player.count({ where }),
    ]);

    return { players, total };
  },

  findByUserId: (userId: string) =>
    prisma.player.findFirst({
      where: { userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, rut: true } }, team: { select: { id: true, name: true, category: true } } },
    }),

  findById: (id: string, clubId: string) =>
    prisma.player.findFirst({
      where: { id, user: { clubId } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, phone: true, rut: true, role: true } },
        team: true,
        injuries: { where: { isActive: true } },
        stats: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    }),

  create: async (clubId: string, dto: CreatePlayerDto, passwordHash: string) => {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          clubId,
          email: dto.email,
          passwordHash,
          role: 'PLAYER',
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          rut: dto.rut,
        },
      });

      const player = await tx.player.create({
        data: {
          userId: user.id,
          teamId: dto.teamId,
          jerseyNumber: dto.jerseyNumber,
          position: dto.position,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          height: dto.height,
          weight: dto.weight,
          clothingSize: dto.clothingSize,
        },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, rut: true } } },
      });

      return player;
    });
  },

  update: async (id: string, data: UpdatePlayerDto) => {
    if (data.rut !== undefined) {
      const existing = await prisma.player.findUnique({ where: { id }, select: { userId: true } });
      if (existing) {
        await prisma.user.update({ where: { id: existing.userId }, data: { rut: data.rut } });
      }
    }
    return prisma.player.update({
      where: { id },
      data: {
        teamId: data.teamId,
        jerseyNumber: data.jerseyNumber,
        position: data.position,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        height: data.height,
        weight: data.weight,
        clothingSize: data.clothingSize,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, rut: true } } },
    });
  },

  deactivate: (id: string) =>
    prisma.player.update({ where: { id }, data: { isActive: false } }),
};
