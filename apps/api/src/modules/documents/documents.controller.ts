import { Response } from 'express';
import { AuthenticatedRequest } from '@/middlewares/auth.middleware';
import { documentsService } from './documents.service';
import { createDocumentSchema } from './documents.schema';

export const documentsController = {
  async getAll(req: AuthenticatedRequest, res: Response) {
    const { playerId, type } = req.query;
    const docs = await documentsService.getAll(req.user!.clubId, {
      playerId: playerId as string,
      type: type as string,
    });
    res.json({ success: true, data: docs });
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const dto = createDocumentSchema.parse(req.body);
    const doc = await documentsService.create(req.user!.clubId, dto);
    res.status(201).json({ success: true, data: doc });
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    await documentsService.delete(req.params.id, req.user!.clubId);
    res.json({ success: true, data: { message: 'Document deleted' } });
  },
};
