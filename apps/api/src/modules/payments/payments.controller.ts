import { Response } from 'express';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { paymentsService } from './payments.service';
import { createPaymentSchema, updatePaymentStatusSchema, PaymentStatus } from './payments.schema';

export const paymentsController = {
  async getAll(req: AuthenticatedRequest, res: Response) {
    const { playerId, status } = req.query;
    const payments = await paymentsService.getAll(req.user!.clubId, {
      playerId: playerId as string,
      status: status as PaymentStatus,
    });
    res.json({ success: true, data: payments });
  },

  async getById(req: AuthenticatedRequest, res: Response) {
    const payment = await paymentsService.getById(req.params.id, req.user!.clubId);
    res.json({ success: true, data: payment });
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const dto = createPaymentSchema.parse(req.body);
    const payment = await paymentsService.create(req.user!.clubId, dto);
    res.status(201).json({ success: true, data: payment });
  },

  async updateStatus(req: AuthenticatedRequest, res: Response) {
    const { status, paidAt } = updatePaymentStatusSchema.parse(req.body);
    const payment = await paymentsService.updateStatus(req.params.id, req.user!.clubId, status, paidAt);
    res.json({ success: true, data: payment });
  },

  async mpWebhook(req: AuthenticatedRequest, res: Response) {
    const { type, data } = req.body;
    if (type === 'payment') {
      await paymentsService.handleMpWebhook(data.id);
    }
    res.sendStatus(200);
  },
};
