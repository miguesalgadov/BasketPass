import { prisma } from '@/config/database';
import { feesRepository } from './fees.repository';
import { feeTypesRepository } from './fee-types.repository';
import { CreateFeeDto, UpdateFeeDto, PayFeeDto, GenerateMonthlyDto, BulkUpdateFeeDto, BulkDeleteFeeDto } from './fees.schema';

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export const feesService = {
  getAll: (clubId: string, filters?: { year?: number; teamId?: string; status?: string }) =>
    feesRepository.findAll(clubId, filters),

  async getById(id: string, clubId: string) {
    const fee = await feesRepository.findById(id, clubId);
    if (!fee) { const e = new Error('Fee not found'); (e as any).statusCode = 404; throw e; }
    return fee;
  },

  // ── matrix ────────────────────────────────────────────────────────────────
  async getMatrix(clubId: string, year: number, feeTypeId?: string, teamId?: string) {
    const feeTypes = await feeTypesRepository.findAll(clubId);
    const activeFeeType = feeTypeId
      ? feeTypes.find((ft) => ft.id === feeTypeId)
      : feeTypes.find((ft) => ft.isRecurring && ft.isActive) ?? feeTypes[0];

    if (!activeFeeType) {
      return { year, feeType: null, players: [], totals: buildEmptyTotals() };
    }

    // Fetch ALL active players (even those with no fees yet)
    const activePlayers = await prisma.player.findMany({
      where: {
        isActive: true,
        user: { clubId },
        ...(teamId && { teamId }),
      },
      select: {
        id: true, jerseyNumber: true, height: true, teamId: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { user: { lastName: 'asc' } },
    });

    const rows = await feesRepository.findMatrix(clubId, year, teamId);
    const filtered = rows.filter((r) => r.feeTypeId === activeFeeType.id);

    // Index fees by playerId for O(1) lookup
    const feesByPlayer = new Map<string, typeof filtered>();
    for (const row of filtered) {
      if (!feesByPlayer.has(row.playerId)) feesByPlayer.set(row.playerId, []);
      feesByPlayer.get(row.playerId)!.push(row);
    }

    const players = activePlayers.map((player) => {
      const fees = feesByPlayer.get(player.id) ?? [];
      const feesByMonth: Record<number, typeof filtered[0] | null> = {};
      for (let m = 1; m <= 12; m++) feesByMonth[m] = null;
      for (const f of fees) feesByMonth[f.month] = f;

      const totalPaid = fees
        .filter((f) => f.status === 'PAID')
        .reduce((s, f) => s + (f.paidAmount ?? f.amount), 0);

      return {
        id:           player.id,
        firstName:    player.user.firstName,
        lastName:     player.user.lastName,
        email:        player.user.email,
        jerseyNumber: player.jerseyNumber,
        height:       player.height,
        teamId:       player.teamId,
        fees:         feesByMonth,
        totalPaid,
      };
    });

    // Totals
    const byMonth: Record<number, { charged: number; pending: number; paid: number; overdue: number; total: number }> = {};
    for (let m = 1; m <= 12; m++) {
      const mFees = filtered.filter((f) => f.month === m);
      byMonth[m] = {
        charged: mFees.filter((f) => f.status === 'PAID').reduce((s, f) => s + (f.paidAmount ?? f.amount), 0),
        pending: mFees.filter((f) => ['PENDING', 'OVERDUE'].includes(f.status)).reduce((s, f) => s + f.amount, 0),
        paid:    mFees.filter((f) => f.status === 'PAID').length,
        overdue: mFees.filter((f) => f.status === 'OVERDUE').length,
        total:   mFees.filter((f) => !['NOT_ENROLLED', 'CANCELLED'].includes(f.status)).length,
      };
    }

    const totalCharged  = filtered.filter((f) => f.status === 'PAID').reduce((s, f) => s + (f.paidAmount ?? f.amount), 0);
    const totalPending  = filtered.filter((f) => ['PENDING', 'OVERDUE'].includes(f.status)).reduce((s, f) => s + f.amount, 0);
    const overdueCount  = filtered.filter((f) => f.status === 'OVERDUE').length;
    const totalActive   = filtered.filter((f) => !['NOT_ENROLLED', 'CANCELLED'].includes(f.status)).length;
    const paymentRate   = totalActive > 0
      ? Math.round((filtered.filter((f) => f.status === 'PAID').length / totalActive) * 100)
      : 0;

    return {
      year,
      feeTypes,
      feeType: activeFeeType,
      players,
      totals: { totalCharged, totalPending, overdueCount, paymentRate, byMonth },
    };
  },

  // ── writes ────────────────────────────────────────────────────────────────

  async create(clubId: string, dto: CreateFeeDto) {
    const feeType = await feeTypesRepository.findById(dto.feeTypeId, clubId);
    if (!feeType) { const e = new Error('FeeType not found'); (e as any).statusCode = 404; throw e; }
    const dueDate = new Date(dto.year, dto.month - 1, feeType.dueDayOfMonth);
    return feesRepository.create({
      clubId,
      playerId:  dto.playerId,
      feeTypeId: dto.feeTypeId,
      year:      dto.year,
      month:     dto.month,
      amount:    dto.amount ?? feeType.amount,
      dueDate,
      notes:     dto.notes,
    });
  },

  async update(id: string, clubId: string, dto: UpdateFeeDto) {
    await feesService.getById(id, clubId);
    return feesRepository.update(id, dto);
  },

  async pay(id: string, clubId: string, dto: PayFeeDto) {
    const fee = await feesService.getById(id, clubId);
    if (fee.status === 'PAID') {
      const e = new Error('La cuota ya está pagada'); (e as any).statusCode = 409; throw e;
    }
    return feesRepository.update(id, {
      status:        'PAID',
      paidAt:        new Date(),
      paidAmount:    dto.paidAmount,
      paymentMethod: dto.paymentMethod,
      notes:         dto.notes ?? fee.notes ?? undefined,
    });
  },

  async markStatus(id: string, clubId: string, status: 'INJURED' | 'NOT_ENROLLED' | 'EXEMPT' | 'CANCELLED', notes?: string) {
    await feesService.getById(id, clubId);
    return feesRepository.update(id, { status, ...(notes && { notes }) });
  },

  async delete(id: string, clubId: string) {
    const fee = await feesService.getById(id, clubId);
    if (fee.status === 'PAID') {
      const e = new Error('No se puede eliminar una cuota pagada'); (e as any).statusCode = 409; throw e;
    }
    return feesRepository.delete(id);
  },

  // ── generation ────────────────────────────────────────────────────────────

  async generateMonthly(clubId: string, dto: GenerateMonthlyDto) {
    const feeTypes = await feeTypesRepository.findRecurring(clubId);
    if (feeTypes.length === 0) {
      const e = new Error('No hay tipos de cuota recurrentes configurados. Creá un tipo de cuota primero.');
      (e as any).statusCode = 422;
      throw e;
    }
    const players     = await prisma.player.findMany({
      where: { user: { clubId }, isActive: true },
      select: { id: true, injuries: { where: { isActive: true } } },
    });

    const records: Parameters<typeof feesRepository.upsertMany>[0] = [];

    for (const ft of feeTypes) {
      const dueDate = new Date(dto.year, dto.month - 1, ft.dueDayOfMonth);
      for (const player of players) {
        const hasActiveInjury = player.injuries.some((inj) => {
          const ret = inj.returnDate;
          return !ret || ret >= dueDate;
        });
        records.push({
          clubId,
          playerId:  player.id,
          feeTypeId: ft.id,
          year:      dto.year,
          month:     dto.month,
          amount:    ft.amount,
          dueDate,
          status:    hasActiveInjury ? 'INJURED' : 'PENDING',
        });
      }
    }

    const results = await feesRepository.upsertMany(records);
    return { created: results.length, month: dto.month, year: dto.year };
  },

  async generateYear(clubId: string, year: number) {
    let total = 0;
    for (let month = 1; month <= 12; month++) {
      const r = await feesService.generateMonthly(clubId, { year, month });
      total += r.created;
    }
    return { created: total, year };
  },

  // ── bulk ──────────────────────────────────────────────────────────────────

  async bulkUpdate(clubId: string, dto: BulkUpdateFeeDto) {
    const validFees = await prisma.fee.findMany({
      where: { id: { in: dto.feeIds }, player: { user: { clubId } } },
      select: { id: true },
    });
    const validIds = validFees.map((f) => f.id);
    if (validIds.length === 0) return { updated: 0 };
    const result = await prisma.fee.updateMany({
      where: { id: { in: validIds } },
      data: {
        status: dto.status,
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    return { updated: result.count };
  },

  async bulkDelete(clubId: string, dto: BulkDeleteFeeDto) {
    const validFees = await prisma.fee.findMany({
      where: { id: { in: dto.feeIds }, player: { user: { clubId } }, status: { not: 'PAID' } },
      select: { id: true },
    });
    if (validFees.length === 0) return { deleted: 0, skipped: dto.feeIds.length };
    const validIds = validFees.map((f) => f.id);
    await prisma.feeReminder.deleteMany({ where: { feeId: { in: validIds } } });
    const result = await prisma.fee.deleteMany({ where: { id: { in: validIds } } });
    return { deleted: result.count, skipped: dto.feeIds.length - result.count };
  },

  // ── reminders ─────────────────────────────────────────────────────────────
  async sendManualReminder(id: string, clubId: string) {
    const fee = await feesService.getById(id, clubId);
    await prisma.feeReminder.create({
      data: { feeId: fee.id, type: 'MANUAL', channel: 'EMAIL', success: true },
    });
    return { sent: true };
  },
};

function buildEmptyTotals() {
  const byMonth: Record<number, any> = {};
  for (let m = 1; m <= 12; m++) byMonth[m] = { charged: 0, pending: 0, paid: 0, overdue: 0, total: 0 };
  return { totalCharged: 0, totalPending: 0, overdueCount: 0, paymentRate: 0, byMonth };
}
