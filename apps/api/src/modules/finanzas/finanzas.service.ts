import path from 'path';
import fs from 'fs';
import { prisma } from '@/config/database';

const MONTHS_ES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

export const INCOME_CATEGORIES: Record<string, string> = {
  MONTHLY_FEE:    'Cuota mensual',
  REGISTRATION:   'Inscripción de jugador',
  TOURNAMENT_FEE: 'Inscripción a torneo (recibida)',
  SPONSORSHIP:    'Auspicio / Publicidad',
  DONATION:       'Donación',
  SUBSIDY:        'Subvención / Aporte municipal',
  OTHER_INCOME:   'Otro ingreso',
};

export const EXPENSE_CATEGORIES: Record<string, string> = {
  VENUE_RENTAL:     'Arriendo de cancha',
  EQUIPMENT:        'Equipamiento y uniformes',
  TRANSPORT:        'Transporte',
  REFEREE:          'Arbitraje',
  TOURNAMENT_ENTRY: 'Inscripción a campeonato',
  COACH_FEE:        'Honorarios entrenador',
  MEDICAL:          'Gastos médicos / kinesiología',
  CLEANING:         'Útiles de aseo',
  ADMIN:            'Gastos administrativos',
  OTHER_EXPENSE:    'Otro egreso',
};

function err(msg: string, code = 400): Error {
  const e = new Error(msg);
  (e as any).statusCode = code;
  return e;
}

export const finanzasService = {
  async getOrCreateAccount(clubId: string) {
    let account = await prisma.clubAccount.findUnique({ where: { clubId } });
    if (!account) {
      account = await prisma.clubAccount.create({
        data: { clubId, name: 'Cuenta principal', currency: 'CLP', currentBalance: 0 },
      });
    }
    return account;
  },

  async getDashboard(clubId: string, year: number, month: number) {
    const start     = new Date(year, month - 1, 1);
    const end       = new Date(year, month, 0, 23, 59, 59, 999);
    const prevStart = new Date(year, month - 2, 1);
    const prevEnd   = new Date(year, month - 1, 0, 23, 59, 59, 999);

    const account = await finanzasService.getOrCreateAccount(clubId);

    const [income, expense, prevIncome, prevExpense, recent, byCategory] = await Promise.all([
      prisma.cashTransaction.aggregate({
        where: { clubId, isVoided: false, type: 'INCOME', date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.cashTransaction.aggregate({
        where: { clubId, isVoided: false, type: 'EXPENSE', date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.cashTransaction.aggregate({
        where: { clubId, isVoided: false, type: 'INCOME', date: { gte: prevStart, lte: prevEnd } },
        _sum: { amount: true },
      }),
      prisma.cashTransaction.aggregate({
        where: { clubId, isVoided: false, type: 'EXPENSE', date: { gte: prevStart, lte: prevEnd } },
        _sum: { amount: true },
      }),
      prisma.cashTransaction.findMany({
        where: { clubId, isVoided: false },
        orderBy: { date: 'desc' },
        take: 5,
        include: { evidences: { select: { id: true } } },
      }),
      prisma.cashTransaction.groupBy({
        by: ['category'],
        where: { clubId, isVoided: false, type: 'EXPENSE', date: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    // Last 6 months chart
    const chartData = await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const d      = new Date(year, month - 1 - (5 - i), 1);
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const [mInc, mExp] = await Promise.all([
          prisma.cashTransaction.aggregate({
            where: { clubId, isVoided: false, type: 'INCOME', date: { gte: mStart, lte: mEnd } },
            _sum: { amount: true },
          }),
          prisma.cashTransaction.aggregate({
            where: { clubId, isVoided: false, type: 'EXPENSE', date: { gte: mStart, lte: mEnd } },
            _sum: { amount: true },
          }),
        ]);
        return {
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          label: MONTHS_ES[d.getMonth()].slice(0, 3),
          income:  mInc._sum.amount ?? 0,
          expense: mExp._sum.amount ?? 0,
        };
      })
    );

    const monthIncome  = income._sum.amount ?? 0;
    const monthExpense = expense._sum.amount ?? 0;

    return {
      currentBalance: account.currentBalance,
      currency:       account.currency,
      monthIncome,
      monthExpense,
      netFlow:     monthIncome - monthExpense,
      prevIncome:  prevIncome._sum.amount  ?? 0,
      prevExpense: prevExpense._sum.amount ?? 0,
      chartData,
      categoryBreakdown: byCategory.map(c => ({
        category: c.category,
        label:    EXPENSE_CATEGORIES[c.category] ?? c.category,
        total:    c._sum.amount ?? 0,
        count:    c._count,
      })),
      recentTransactions: recent.map(t => ({
        id:            t.id,
        type:          t.type,
        amount:        t.amount,
        concept:       t.concept,
        category:      t.category,
        date:          t.date.toISOString(),
        evidenceCount: t.evidences.length,
      })),
    };
  },

  async getTransactions(clubId: string, filters: {
    year: number; month: number;
    type?: string; category?: string;
    search?: string; page?: number; pageSize?: number;
  }) {
    const { year, month, type, category, search, page = 1, pageSize = 30 } = filters;
    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59, 999);

    const where: any = {
      clubId,
      isVoided: false,
      date: { gte: start, lte: end },
    };
    if (type && type !== 'all') where.type = type;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { concept:     { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.cashTransaction.findMany({
        where,
        include: {
          evidences: { select: { id: true, fileName: true, mimeType: true, publicUrl: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.cashTransaction.count({ where }),
    ]);

    return {
      transactions: transactions.map(t => ({
        id:              t.id,
        type:            t.type,
        amount:          t.amount,
        concept:         t.concept,
        description:     t.description,
        category:        t.category,
        date:            t.date.toISOString(),
        paymentMethod:   t.paymentMethod,
        referenceNumber: t.referenceNumber,
        balanceAfter:    t.balanceAfter,
        source:          t.source,
        createdBy:       `${t.createdBy.firstName} ${t.createdBy.lastName}`,
        evidences:       t.evidences,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async createTransaction(clubId: string, userId: string, data: {
    type: string;
    amount: number;
    date: string;
    concept: string;
    description?: string;
    category: string;
    paymentMethod?: string;
    referenceNumber?: string;
  }) {
    if (!['INCOME','EXPENSE','ADJUSTMENT'].includes(data.type)) {
      throw err('Tipo inválido');
    }
    const account = await finanzasService.getOrCreateAccount(clubId);
    const delta      = data.type === 'EXPENSE' ? -data.amount : data.amount;
    const newBalance = account.currentBalance + delta;

    return prisma.$transaction(async tx => {
      const t = await tx.cashTransaction.create({
        data: {
          accountId:       account.id,
          clubId,
          type:            data.type,
          amount:          data.amount,
          date:            new Date(data.date),
          concept:         data.concept,
          description:     data.description,
          category:        data.category,
          source:          'MANUAL',
          paymentMethod:   data.paymentMethod,
          referenceNumber: data.referenceNumber,
          balanceAfter:    newBalance,
          createdById:     userId,
        },
      });
      await tx.clubAccount.update({
        where: { id: account.id },
        data: { currentBalance: newBalance, lastUpdatedAt: new Date() },
      });
      return t;
    });
  },

  async voidTransaction(id: string, clubId: string, reason: string, userId: string) {
    const tx = await prisma.cashTransaction.findFirst({ where: { id, clubId } });
    if (!tx) throw err('Transacción no encontrada', 404);
    if (tx.isVoided) throw err('La transacción ya está anulada', 409);

    const account    = await finanzasService.getOrCreateAccount(clubId);
    const delta      = tx.type === 'EXPENSE' ? tx.amount : -tx.amount;
    const newBalance = account.currentBalance + delta;

    await prisma.$transaction(async t => {
      await t.cashTransaction.update({
        where: { id },
        data: { isVoided: true, voidReason: reason, voidedAt: new Date(), voidedById: userId },
      });
      await t.clubAccount.update({
        where: { id: account.id },
        data: { currentBalance: newBalance, lastUpdatedAt: new Date() },
      });
    });

    return { success: true };
  },

  async adjustBalance(clubId: string, realBalance: number, reason: string, userId: string) {
    const account    = await finanzasService.getOrCreateAccount(clubId);
    const difference = realBalance - account.currentBalance;

    await prisma.$transaction(async tx => {
      await tx.cashTransaction.create({
        data: {
          accountId:    account.id,
          clubId,
          type:         'ADJUSTMENT',
          amount:       Math.abs(difference),
          date:         new Date(),
          concept:      `Ajuste de saldo — ${reason}`,
          category:     'ADJUSTMENT',
          source:       'MANUAL',
          balanceAfter: realBalance,
          createdById:  userId,
          description:  `Saldo anterior: $${account.currentBalance.toLocaleString('es-CL')}. Saldo real: $${realBalance.toLocaleString('es-CL')}.`,
        },
      });
      await tx.clubAccount.update({
        where: { id: account.id },
        data: { currentBalance: realBalance, lastUpdatedAt: new Date() },
      });
    });

    return { success: true };
  },

  async addEvidence(transactionId: string, clubId: string, userId: string, file: Express.Multer.File) {
    const tx = await prisma.cashTransaction.findFirst({ where: { id: transactionId, clubId } });
    if (!tx) throw err('Transacción no encontrada', 404);

    const count = await prisma.transactionEvidence.count({ where: { transactionId } });
    if (count >= 10) throw err('Máximo 10 evidencias por transacción');

    return prisma.transactionEvidence.create({
      data: {
        transactionId,
        clubId,
        fileName:     file.originalname,
        fileSize:     file.size,
        mimeType:     file.mimetype,
        storageKey:   file.filename,
        publicUrl:    `/evidences/${clubId}/${file.filename}`,
        uploadedById: userId,
      },
    });
  },

  async deleteEvidence(evidenceId: string, clubId: string) {
    const evidence = await prisma.transactionEvidence.findFirst({ where: { id: evidenceId, clubId } });
    if (!evidence) throw err('Evidencia no encontrada', 404);

    try {
      const filePath = path.join(process.cwd(), '..', 'web', 'public', 'evidences', clubId, evidence.storageKey);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch { /* silent */ }

    return prisma.transactionEvidence.delete({ where: { id: evidenceId } });
  },

  getCategories() {
    return { income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES };
  },

  async getPaymentStats(clubId: string, year: number, month: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth   = new Date(year, month, 0, 23, 59, 59, 999);

    const [paidMonth, pendingUpToMonth, overdueYear, paidUpToMonth, activeUpToMonth] = await Promise.all([
      // Recaudado este mes: cuotas del mes en curso marcadas PAID
      // Suma paidAmount cuando existe, amount como fallback (ej. marcadas PAID vía bulkUpdate)
      prisma.$queryRaw<[{ total: number; cnt: number }]>`
        SELECT
          COALESCE(SUM(COALESCE("paidAmount", amount)), 0) AS total,
          COUNT(*) AS cnt
        FROM "Fee"
        WHERE "clubId" = ${clubId}
          AND status   = 'PAID'
          AND year     = ${year}
          AND month    = ${month}
      `.then(([r]) => ({
        _sum:   { paidAmount: Number(r.total) },
        _count: Number(r.cnt),
      })),
      // Por recaudar: PENDING + OVERDUE del mes actual hacia atrás
      prisma.fee.aggregate({
        where: { clubId, status: { in: ['PENDING', 'OVERDUE'] }, year, month: { lte: month } },
        _sum: { amount: true },
        _count: true,
      }),
      // Cuotas vencidas en el año
      prisma.fee.count({ where: { clubId, status: 'OVERDUE', year } }),
      // Pagadas acumuladas hasta el mes actual (para tasa de pago real)
      prisma.fee.count({ where: { clubId, status: 'PAID', year, month: { lte: month } } }),
      // Activas hasta el mes actual (excluye canceladas/exentas/no-inscriptas)
      prisma.fee.count({ where: { clubId, year, month: { lte: month }, status: { notIn: ['NOT_ENROLLED', 'EXEMPT', 'CANCELLED'] } } }),
    ]);

    const rate = activeUpToMonth > 0 ? Math.round((paidUpToMonth / activeUpToMonth) * 100) : 0;

    return {
      paidThisMonth:  paidMonth._sum.paidAmount ?? 0,
      paidCount:      paidMonth._count,
      pendingTotal:   pendingUpToMonth._sum.amount ?? 0,
      pendingCount:   pendingUpToMonth._count,
      overdueCount:   overdueYear,
      paymentRate:    rate,
    };
  },

  async getAccount(clubId: string) {
    return finanzasService.getOrCreateAccount(clubId);
  },

  // Called from fees service when a fee is paid
  async autoCreateIncomeFromFee(
    feeId:      string,
    clubId:     string,
    userId:     string,
    paidAmount: number,
    mpPaymentId?: string,
  ) {
    const existing = await prisma.cashTransaction.findFirst({ where: { feeId, isVoided: false } });
    if (existing) return; // idempotent

    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { player: { include: { user: true } } },
    });
    if (!fee) return;

    const account    = await finanzasService.getOrCreateAccount(clubId);
    const newBalance = account.currentBalance + paidAmount;
    const name       = `${fee.player.user.firstName} ${fee.player.user.lastName}`;
    const monthLabel = `${MONTHS_ES[fee.month - 1]} ${fee.year}`;

    await prisma.$transaction(async tx => {
      await tx.cashTransaction.create({
        data: {
          accountId:    account.id,
          clubId,
          type:         'INCOME',
          amount:       paidAmount,
          date:         new Date(),
          concept:      `Cuota ${monthLabel} — ${name}`,
          category:     'MONTHLY_FEE',
          source:       mpPaymentId ? 'AUTO_MP' : 'AUTO_FEE',
          feeId,
          mpPaymentId,
          paymentMethod: mpPaymentId ? 'MercadoPago' : 'Manual',
          balanceAfter:  newBalance,
          createdById:   userId,
        },
      });
      await tx.clubAccount.update({
        where: { id: account.id },
        data: { currentBalance: newBalance, lastUpdatedAt: new Date() },
      });
    });
  },
};
