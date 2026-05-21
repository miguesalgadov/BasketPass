import { prisma } from '@/config/database';

const playerInclude = {
  user: { select: { firstName: true, lastName: true, email: true } },
};

const feeInclude = {
  player:  { include: playerInclude },
  feeType: { select: { id: true, name: true, amount: true, currency: true } },
  reminders: { orderBy: { sentAt: 'desc' as const }, take: 10 },
};

export const feesRepository = {
  // ── reads ─────────────────────────────────────────────────────────────────

  findAll: (clubId: string, filters?: { year?: number; teamId?: string; status?: string }) =>
    prisma.fee.findMany({
      where: {
        clubId,
        ...(filters?.year   && { year: filters.year }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.teamId && { player: { teamId: filters.teamId } }),
      },
      include: feeInclude,
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    }),

  findById: (id: string, clubId: string) =>
    prisma.fee.findFirst({ where: { id, clubId }, include: feeInclude }),

  findByDueDate: (date: Date, statuses: string[]) =>
    prisma.fee.findMany({
      where: {
        status: { in: statuses },
        dueDate: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt:  new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
      },
      include: { player: { include: { user: true } }, feeType: true, reminders: true },
    }),

  findOverdueDaysAgo: (days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return prisma.fee.findMany({
      where: {
        status: 'OVERDUE',
        dueDate: {
          gte: new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate()),
          lt:  new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate() + 1),
        },
      },
      include: { player: { include: { user: true } }, feeType: true, reminders: true },
    });
  },

  // ── matrix ────────────────────────────────────────────────────────────────

  // Returns all fees for a club/year grouped for matrix rendering
  findMatrix: (clubId: string, year: number, teamId?: string) =>
    prisma.fee.findMany({
      where: {
        clubId,
        year,
        ...(teamId && { player: { teamId } }),
      },
      select: {
        id: true, playerId: true, feeTypeId: true, month: true,
        status: true, amount: true, dueDate: true,
        paidAt: true, paidAmount: true, paymentMethod: true, notes: true,
        player: {
          select: {
            id: true, jerseyNumber: true, height: true, teamId: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        feeType: { select: { id: true, name: true, currency: true } },
      },
      orderBy: [{ player: { user: { lastName: 'asc' } } }, { month: 'asc' }],
    }),

  // ── writes ────────────────────────────────────────────────────────────────

  create: (data: {
    clubId: string; playerId: string; feeTypeId: string;
    year: number; month: number; amount: number; dueDate: Date;
    status?: string; notes?: string;
  }) => prisma.fee.create({ data, include: feeInclude }),

  upsertMany: (records: {
    clubId: string; playerId: string; feeTypeId: string;
    year: number; month: number; amount: number; dueDate: Date; status: string;
  }[]) =>
    prisma.$transaction(
      records.map((r) =>
        prisma.fee.upsert({
          where: { playerId_feeTypeId_year_month: { playerId: r.playerId, feeTypeId: r.feeTypeId, year: r.year, month: r.month } },
          create: r,
          update: {}, // don't overwrite if exists
        })
      )
    ),

  update: (id: string, data: Partial<{
    status: string; amount: number; notes: string;
    paidAt: Date; paidAmount: number; paymentMethod: string; receiptUrl: string;
  }>) => prisma.fee.update({ where: { id }, data }),

  delete: (id: string) => prisma.fee.delete({ where: { id } }),

  markOverdue: (cutoffDate: Date) =>
    prisma.fee.updateMany({
      where: { status: 'PENDING', dueDate: { lt: cutoffDate } },
      data: { status: 'OVERDUE' },
    }),
};
