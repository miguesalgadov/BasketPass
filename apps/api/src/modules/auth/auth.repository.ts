import { prisma } from '@/config/database';

export const authRepository = {
  findUserByEmail: (clubId: string, email: string) =>
    prisma.user.findFirst({ where: { clubId, email, isActive: true } }),

  findUserByEmailGlobal: (email: string) =>
    prisma.user.findFirst({ where: { email, isActive: true }, include: { club: true } }),

  findClubBySlug: (slug: string) =>
    prisma.club.findUnique({ where: { slug } }),

  createClubWithAdmin: async (data: {
    clubName: string;
    clubSlug: string;
    adminEmail: string;
    passwordHash: string;
    adminFirstName: string;
    adminLastName: string;
    adminPhone?: string;
  }) => {
    return prisma.$transaction(async (tx) => {
      const club = await tx.club.create({
        data: {
          name: data.clubName,
          slug: data.clubSlug,
        },
      });

      const user = await tx.user.create({
        data: {
          clubId: club.id,
          email: data.adminEmail,
          passwordHash: data.passwordHash,
          role: 'CLUB_ADMIN',
          firstName: data.adminFirstName,
          lastName: data.adminLastName,
          phone: data.adminPhone,
        },
        include: { club: true },
      });

      return { club, user };
    });
  },

  saveRefreshToken: (userId: string, token: string, expiresAt: Date) =>
    prisma.refreshToken.create({ data: { userId, token, expiresAt } }),

  findRefreshToken: (token: string) =>
    prisma.refreshToken.findUnique({ where: { token }, include: { user: { include: { club: true } } } }),

  deleteRefreshToken: (token: string) =>
    prisma.refreshToken.delete({ where: { token } }),

  deleteAllUserRefreshTokens: (userId: string) =>
    prisma.refreshToken.deleteMany({ where: { userId } }),

  updateLastLogin: (userId: string) =>
    prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } }),
};
