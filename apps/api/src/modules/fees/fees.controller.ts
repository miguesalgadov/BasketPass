import { Response } from 'express';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { feesService } from './fees.service';
import { finanzasService } from '../finanzas/finanzas.service';
import { prisma } from '@/config/database';
import {
  createFeeSchema, updateFeeSchema, payFeeSchema,
  generateMonthlySchema, generateYearSchema, bulkUpdateFeeSchema, bulkDeleteFeeSchema,
} from './fees.schema';

export const feesController = {
  async getMyFees(req: AuthenticatedRequest, res: Response) {
    const player = await prisma.player.findFirst({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!player) { res.status(404).json({ success: false, error: { message: 'Player not found' } }); return; }
    const fees = await prisma.fee.findMany({
      where: { playerId: player.id },
      include: { feeType: { select: { name: true, currency: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json({ success: true, data: fees });
  },

  async getAll(req: AuthenticatedRequest, res: Response) {
    const { year, teamId, status } = req.query as Record<string, string>;
    const data = await feesService.getAll(req.user!.clubId, {
      year:   year   ? Number(year)  : undefined,
      teamId: teamId || undefined,
      status: status || undefined,
    });
    res.json({ success: true, data });
  },

  async getMatrix(req: AuthenticatedRequest, res: Response) {
    const { year, feeTypeId, teamId } = req.query as Record<string, string>;
    const data = await feesService.getMatrix(
      req.user!.clubId,
      year ? Number(year) : new Date().getFullYear(),
      feeTypeId || undefined,
      teamId    || undefined,
    );
    res.json({ success: true, data });
  },

  async getById(req: AuthenticatedRequest, res: Response) {
    const data = await feesService.getById(req.params.id, req.user!.clubId);
    res.json({ success: true, data });
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const dto = createFeeSchema.parse(req.body);
    const data = await feesService.create(req.user!.clubId, dto);
    res.status(201).json({ success: true, data });
  },

  async update(req: AuthenticatedRequest, res: Response) {
    const dto = updateFeeSchema.parse(req.body);
    const data = await feesService.update(req.params.id, req.user!.clubId, dto);
    res.json({ success: true, data });
  },

  async pay(req: AuthenticatedRequest, res: Response) {
    const dto = payFeeSchema.parse(req.body);
    const data = await feesService.pay(req.params.id, req.user!.clubId, dto);
    // Auto-create cash flow income entry (fire-and-forget, non-blocking)
    finanzasService.autoCreateIncomeFromFee(
      req.params.id, req.user!.clubId, req.user!.id, dto.paidAmount,
    ).catch(() => { /* silent — finanzas is best-effort */ });
    res.json({ success: true, data });
  },

  async markInjured(req: AuthenticatedRequest, res: Response) {
    const data = await feesService.markStatus(req.params.id, req.user!.clubId, 'INJURED', req.body.notes);
    res.json({ success: true, data });
  },

  async markExempt(req: AuthenticatedRequest, res: Response) {
    const data = await feesService.markStatus(req.params.id, req.user!.clubId, 'EXEMPT', req.body.notes);
    res.json({ success: true, data });
  },

  async markNotEnrolled(req: AuthenticatedRequest, res: Response) {
    const data = await feesService.markStatus(req.params.id, req.user!.clubId, 'NOT_ENROLLED', req.body.notes);
    res.json({ success: true, data });
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    await feesService.delete(req.params.id, req.user!.clubId);
    res.json({ success: true, data: { message: 'Fee deleted' } });
  },

  async generateMonthly(req: AuthenticatedRequest, res: Response) {
    const dto = generateMonthlySchema.parse(req.body);
    const data = await feesService.generateMonthly(req.user!.clubId, dto);
    res.status(201).json({ success: true, data });
  },

  async generateYear(req: AuthenticatedRequest, res: Response) {
    const { year } = generateYearSchema.parse(req.body);
    const data = await feesService.generateYear(req.user!.clubId, year);
    res.status(201).json({ success: true, data });
  },

  async remind(req: AuthenticatedRequest, res: Response) {
    const data = await feesService.sendManualReminder(req.params.id, req.user!.clubId);
    res.json({ success: true, data });
  },

  async bulkUpdate(req: AuthenticatedRequest, res: Response) {
    const dto = bulkUpdateFeeSchema.parse(req.body);
    const data = await feesService.bulkUpdate(req.user!.clubId, dto);
    res.json({ success: true, data });
  },

  async bulkDelete(req: AuthenticatedRequest, res: Response) {
    const dto = bulkDeleteFeeSchema.parse(req.body);
    const data = await feesService.bulkDelete(req.user!.clubId, dto);
    res.json({ success: true, data });
  },
};
