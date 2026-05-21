import { prisma } from '@/config/database';
import { CreatePaymentDto, PaymentStatus } from './payments.schema';

export const paymentsRepository = {
  findAll: (clubId: string, filters?: { playerId?: string; status?: PaymentStatus }) =>
    prisma.payment.findMany({
      where: { clubId, ...filters },
      include: {
        player: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),

  findById: (id: string, clubId: string) =>
    prisma.payment.findFirst({ where: { id, clubId } }),

  create: (clubId: string, dto: CreatePaymentDto) =>
    prisma.payment.create({ data: { clubId, ...dto, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined } }),

  updateStatus: (id: string, status: PaymentStatus, paidAt?: Date) =>
    prisma.payment.update({
      where: { id },
      data: { status, paidAt },
    }),

  findOverduePayments: () =>
    prisma.payment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lt: new Date() },
      },
      include: {
        player: { include: { user: { select: { email: true, firstName: true } } } },
      },
    }),

  findUpcomingDue: (daysAhead: number) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    return prisma.payment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { gte: new Date(), lte: futureDate },
      },
      include: {
        player: { include: { user: { select: { email: true, firstName: true } } } },
      },
    });
  },
};
