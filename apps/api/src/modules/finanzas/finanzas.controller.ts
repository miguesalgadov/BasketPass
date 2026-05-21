import { Response } from 'express';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { finanzasService } from './finanzas.service';

export const finanzasController = {
  async getAccount(req: AuthenticatedRequest, res: Response) {
    const data = await finanzasService.getAccount(req.user!.clubId);
    res.json({ success: true, data });
  },

  async getDashboard(req: AuthenticatedRequest, res: Response) {
    const year  = parseInt(req.query.year  as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const data = await finanzasService.getDashboard(req.user!.clubId, year, month);
    res.json({ success: true, data });
  },

  async getTransactions(req: AuthenticatedRequest, res: Response) {
    const year     = parseInt(req.query.year     as string) || new Date().getFullYear();
    const month    = parseInt(req.query.month    as string) || new Date().getMonth() + 1;
    const page     = parseInt(req.query.page     as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 30;
    const { type, category, search } = req.query as Record<string, string>;
    const data = await finanzasService.getTransactions(req.user!.clubId, {
      year, month, type, category, search, page, pageSize,
    });
    res.json({ success: true, data });
  },

  async createTransaction(req: AuthenticatedRequest, res: Response) {
    const { type, amount, date, concept, description, category, paymentMethod, referenceNumber } = req.body;
    if (!type || !amount || !date || !concept || !category) {
      res.status(400).json({ success: false, error: { message: 'Faltan campos requeridos' } });
      return;
    }
    const data = await finanzasService.createTransaction(req.user!.clubId, req.user!.id, {
      type,
      amount: parseFloat(amount),
      date,
      concept,
      description,
      category,
      paymentMethod,
      referenceNumber,
    });
    res.status(201).json({ success: true, data });
  },

  async voidTransaction(req: AuthenticatedRequest, res: Response) {
    const { reason } = req.body;
    if (!reason) {
      res.status(400).json({ success: false, error: { message: 'reason requerido' } });
      return;
    }
    const data = await finanzasService.voidTransaction(
      req.params.id, req.user!.clubId, reason, req.user!.id,
    );
    res.json({ success: true, data });
  },

  async adjustBalance(req: AuthenticatedRequest, res: Response) {
    const { realBalance, reason } = req.body;
    if (realBalance === undefined || !reason) {
      res.status(400).json({ success: false, error: { message: 'realBalance y reason requeridos' } });
      return;
    }
    const data = await finanzasService.adjustBalance(
      req.user!.clubId, parseFloat(realBalance), reason, req.user!.id,
    );
    res.json({ success: true, data });
  },

  async addEvidence(req: AuthenticatedRequest, res: Response) {
    if (!req.file) {
      res.status(400).json({ success: false, error: { message: 'Archivo requerido' } });
      return;
    }
    const data = await finanzasService.addEvidence(
      req.params.id, req.user!.clubId, req.user!.id, req.file,
    );
    res.status(201).json({ success: true, data });
  },

  async deleteEvidence(req: AuthenticatedRequest, res: Response) {
    await finanzasService.deleteEvidence(req.params.evidenceId, req.user!.clubId);
    res.json({ success: true });
  },

  async getCategories(_req: AuthenticatedRequest, res: Response) {
    const data = finanzasService.getCategories();
    res.json({ success: true, data });
  },

  async getPaymentStats(req: AuthenticatedRequest, res: Response) {
    const year  = parseInt(req.query.year  as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
    const data  = await finanzasService.getPaymentStats(req.user!.clubId, year, month);
    res.json({ success: true, data });
  },
};
